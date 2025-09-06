---
title: 现代C++32讲：编译期能做些什么？一个完整的计算世界
date: 2025-09-06 23:08:14
tags: C++
categories: C++
---
# 编译期计算
C++模板是图灵完全的，也就是说使用 C++模板，可以在编译期间模拟一个完整的图灵机，也就是说，可以完成任何的计算任务。
当然，从实际的角度，我们并不想也不可能在编译期完成所有的计算，更不用说编译期的编程是很容易让人看不懂的。

```cpp
template <int n>
struct factorial {
    static const int value = n * factor<n - 1>::value;
};

template <>
struct factorial<0> {
    static const int value = 1;
}
```
这里定义了一个递归的阶乘函数。

那我们怎么知道这个计算是不是在编译期做的呢？我们可以直接看编译输出。下面这里是对上面这样的代码加输出（`printf("%d\n", factorial<10>::value);`）在 x86-64 下的编译结果：
```
.LC0: 
    .string "%d\n" 
main: 
    push rbp 
    mov rbp, rsp 
    mov esi, 3628800 
    mov edi, OFFSET FLAT:.LC0
    mov eax, 0
    call printf 
    mov eax, 0 
    pop rbp 
    ret
```
我们可以看到，编译结果里直接出现了常量 3628800 这个计算结果，上面的递归逻辑全都没了踪影。

可以看到，要进行模板期编程，最主要的一点是要把计算转变为类型推导。比如下面的模板可以代表条件语句：
```cpp
template <bool cond, typename Then, typename Else>
struct If;

template <typename Then, typename Else>
struct If<true, Then, Else> {
    typedef Then type;
};

template <typename Then, typename Else>
struct If<false, Then, Else> {
    typedef Else type;
}
```

循环：
```cpp
template <bool condition, typename Body>
struct WhileLoop;

template <typename Body>
struct WhileLoop<true, Body> {
    typedef typename WhileLoop<Body::cond_value, typename Body::next_type>::type type;
};

template <typename Body>
struct WhileLoop<false, Body> {
    typedef typename Body::res_type type;
};

template <typename Body>
struct While {
    typedef typename WhileLoop<Body::cond_value, Body>::type type;
};
```

为了进行计算，还需要通用的代表数值的类型，下面这个模板可以通用地代表一个整数常数：
```cpp
template <class T, T v>
struct integral_constant {
    static const T value = v;
    typedef T value_type;
    typedef integral_constant type;
};
```

有了这个模板的帮忙，我们就可以进行一些更通用的计算了：
```cpp
template <int result, int n>
struct SumLoop {
    static const bool cond_value = n != 0;
    static const int res_value = result;
    typedef integral_constant<int, res_value> res_type;
    typedef SumLoop<result + n, n - 1> next_type;
};

template <int n>
struct Sum {
    typedef SumLoop<0, n> type;
};
```

此时使用 `While<Sum<10>::type>::type::value` 就能得到 1 加到 10 的结果了。

# 编译期类型推导
为了方便地在值和类型之间转换，标准库定义了一些经常需要用到的工具类。上面描述的 integral_constant 就是其中一个。为了方便使用，针对布尔值有两个额外的类型定义：
```cpp
typedef std::integral_constant<bool, true> true_type;
typedef std::integral_constant<bool, false> false_type;
```

有一个工具函数常常会写成下面这个样子：
```cpp
template <typename T>
class SomeContainer {
public:
    ...
    static void destroy(T *ptr) 
    {
        _destroy(ptr, is_trivially_destructible<T>());
    }

private:
    static void _destroy(T* ptr, true_type) {}
    static void _destroy(T* ptr, false_type) 
    {
        ptr->~T();
    }
}
```
为了确保最大程度的优化，常用的一个技巧就是用 is_trivially_destructible 模板来判断类是否是可平凡析构的，也就是说，不调用析构函数也不会产生任何资源泄露问题。模板返回的结果还是一个类，要么是 true_type，要么是 false_type。如果要得到布尔值的话，当然使用 is_trivially_destructible::value 就可以，但此处不需要。我们需要的是调用该类型的构造函数，让编译器根据数值类型来选择合适的重载。这样，在优化编译的情况下，编译器可以把不需要的析构操作彻底全部删除。

像 is_trivially_destructible 这样的 trait 类有很多，可以用来在模板里决定所需的特殊行为： 
- is_array 
- is_enum 
- is_function 
- is_pointer 
- is_reference 
- is_const 
- has_virtual_destructor

我们还有以常见的模板 remove_const 为例，它的定义大致如下：
```cpp
template <class T>
struct remove_const {
    typedef T type;
};

template <class T>
struct remove_const<const T> {
    typedef T type;
};
```
它也是利用模板的特化，针对 const 类型去掉相应的修饰。
这里有个细节，如果是对 const char* 应用 remove_const 的话，结果还是 const char。原因是 const char* 是指向 const char 的指针，而不是指向 char 的 const 指针。如果我们对 char* const 应用 remove_const 的话，还是可以得到 char* 的。

# 简易写法
在当前的 C++标准里，is_trivially_destructible::value 有增加 \_v的编译时常量，is_trivially_destructible::type 有增加\_t 的类型别名：
```cpp
template <class T>
inline constexpr bool is_trivially_destructible_v = is_trivially_destructible<T>::value;
```
using 是现代 C++的新语法，功能大致与 typedef 相似。但是 typedef 只能针对某个特定的类型，而 using 可以生成别名模板。目前我们只需要知道，在你需要 trait 模板的结果数值和类型时，使用带\_v 和 \_t 后缀的模板可能会更方便，尤其是带 \_t 后缀的类型转换模板。

# 通用的 fmap 函数模板
下面演示一个 fmap 函数，其中用到了目前为止学到的多个知识点：
```cpp
template <
    template <typename, typename>
    class OutContainer = vector,
    typename F, class R>
auto fmap(F&& f, R&& inputs)
{
    typedef decay_t<decltype(f(*inputs.begin()))> result_type;
    OutContainer<result_type, allocator<result_type>> result;
    for (auto&& item : inputs) {
        result.push_back(f(item));
    }
    return result;
}
```

- 用 decltype 来获得用 f 来调用 inputs 元素的类型
- 用 decay_t 来把获得的类型变成一个普通的值类型
- 缺省使用 vector 来作为返回值的容器，但可以通过模板参数改为其他容器
- 使用基于范围的 for 循环来遍历 inputs，对其类型不作其他要求
- 存放结果的容器需要支持 push_back 成员函数