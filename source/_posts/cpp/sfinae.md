---
title: 现代C++32讲：SFINAE - 不是错误的替换失败是怎么回事？
date: 2025-09-16 00:35:52
tags: C++
categories: C++
---
# 函数模板的重载决议
当一个函数名称和某个函数模板名称匹配时，重载决议过程大致如下：
- 根据名称找出所有适用的函数和函数模板
- 对于适用的函数模板，要根据实际情况对模板形参进行替换；替换过程中如果发生错误，这个模板会被丢弃
- 在上面两步生成的可行函数集合中，编译器会寻找一个最佳匹配，产生对该函数的调用
- 如果没有找到最佳匹配，或者找到多个匹配程度相当的函数，则编译器需要报错

来看一个具体的例子：
```cpp
#include <stdio.h>

struct Test {
    typedef int foo;
};

template <typename T>
void f(typename T::foo)
{
    puts("1");
}

template <typename T>
void f(T)
{
    puts("2");
}

int main()
{
    f<Test>(10);
    f<int>(10);
}
```
输出为：
```bash
1
2
```

这里体现了 SFINAE 设计的最初用法：如果模板实例化中发生了失败，没有理由编译就此出错终止，因为还是可能有其他可用的函数重载的。
这里的失败仅仅指的是函数模板的原型声明，即参数和返回值。函数体内的失败不考虑在内。如果重载决议选择了某个函数模板，而函数体在实例化的过程中出错，那我们仍然会得到一个编译错误。

# 编译期成员检测
不过，很快人们就发现 SFINAE 可以用于其他用途。比如根据某个实例化的成功或失败来在编译期检测类的特性。下面这个模板就可以检测一个类是否有一个名叫 reserve、参数类型为 size_t 的成员函数：
```cpp
template <typename T>
struct has_reserve {
    struct good { char dummy; };
    struct bad { char dummy[2]; };
    template <class U, void (U::*)(size_t)>
    struct SFINAE {};
    template <class U>
    static good reserve(SFINAE<U, &U::reserve>*);
    template <class U>
    static bad reserve(...);
    static const bool value = sizeof(reserve<T>(nullptr)) == sizeof(good);
};
```
- 这里定义了两个大小不同的结构体`good`和`bad`，用于后续通过`sizeof`区分哪个函数被选中
- 定义了一个辅助模板`SFINAE`，这里接收一个成员函数指针：`void (U::*)(size_t)`，即 返回`void`、接收`size_t`参数的成员函数
- 定义了两个版本的`reserve`函数
    - 第一个返回 `good` 的版本，参数是一个指针 `SFINAE<U, &U::reserve>`。如果 `U` 有 `void reserve(size_t)` 这个成员函数，那么 `&U::reserve` 是合法的，`SFINAE<U, &U::reserve>` 可以实例化 -> 这个函数参与重载；否则该函数被移除
    - 第二个返回 `bad` 的版本则是一个兜底，只有当第一个函数因为 SFINAE 被移除时，才会选择它
- 编译期判断：`static const bool value = sizeof(reserve<T>(nullptr)) == sizeof(good);` 这是最关键的一步。调用重载的 `reserve` 函数模板并传入 `nullptr`，此时会匹配 `good` 版本，并且编译器会尝试 `reserve<SFINAE<T, &T::reserve>*>`，如果 `T` 有这个`reserve`成员函数，那么这个`static reserve` 函数存在，此时 `== sizeof(good)` 成立；否则会调用 `bad` 版本，`== sizeof(good)` 不成立。通过结果的成立和不成立即可反推一个类是否存在 `void reserve(size_t)` 成员函数。

# SFINAE 模板技巧
## enable_if
C++11 开始，标准库里有了一个叫 `enable_if` 的模板，可以用它来选择性地启用某个函数的重载。
假设我们有一个函数，用来往一个容器尾部追加元素。我们希望原型是这样的：
```cpp
template <typename C, typename T>
void append(C& container, T* ptr, size_t size);
```

显然，`container` 有没有 `reserve` 成员函数，是对性能有影响的 —— 有影响的话，我们通常应该预留好内存空间，以免产生不必要的对象移动甚至拷贝操作。利用 `enable_if` 和上面的 `has_reserve` 模板，我们就可以这么写：
```cpp
template <typename C, typename T>
enable_if_t<has_reserve<C>::value, void> append(C& container, T* ptr, size_t size)
{
    container.reserve(container.size() + size);
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}

template <typename C, typename T>
enable_if_t<!has_reserve<C>::value, void> append(C& container, T* ptr, size_t size)
{
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}
```
## decltype 返回值
如果只需要在某个操作有效的情况下启用某个函数，而不需要考虑相反的情况的话，有另外一个技巧可以用。对于上面的 append 的情况，如果我们想限制只有具有 reserve 成员函数的类可以使用这个重载，我们可以把代码简化成：
```cpp
template <typename C, typename T>
auto append(C& container, T* ptr, size_t size) -> decltype(declval<C&>().reserve(1U), void)
{
    // ...
}
```
`std::declval<T>()` 不需要构造对象就能“假想”出一个 `T` 类型的实例，它只能用于 `decltype` 等上下文中，这里的 `declval<C&>()` 表示 假设有一个 `C&` 类型的值；并调用 `.reserve(1U)`，如果 `C` 没有 `reserve` 方法，则这个表达式非法。
注意这里的逗号表达式 `declval, void` 的结果类型是 `void`。
如果存在 `reserve` 方法，才会成功实例化这个模板；否则根据 SFINAE，会将这个函数从重载集中移除。
这个方式和 enable_if 不同，很难表示否定的条件。

## void_t
void_t 是 C++17 新引入的一个模板，它的定义很简单：
```cpp
template <typename...>
using void_t = void;
```

换句话说，这个类型模板会把任意类型映射到 void。它的特殊性在于，在这个看似无聊的过程中，编译器会检查那个“任意类型”的有效性。利用 decltype、declval 和模板特化，我们可以把 has_reserve 的定义大大简化：
```cpp
template <typename T, typename = void_t<>>
struct has_reserve : false_type {};

template <typename T>
struct has_reserve<T, void_t<decltype(declval<T&>().reserve(1U))>> : true_type {};
```
第二个 has_reserve 模板的定义实际上是一个偏特化。当 T 满足 `void_t` 中的表达式，也就是存在 reserve 方法时，特化匹配成功，否则回退到第一个主模板。
所以这里 `void_t` 的作用实际上就是，检测模板参数是否合法，如果非法则整个表达式替换失败。

## 标签分发
在上一讲，我们提到了用 true_type 和 false_type 来选择合适的重载，这种技巧有个专门的名字，叫标签分发。我们的 append 也可以用标签分发来实现：
```cpp
template <typename C, typename T>
void _append(C& container, T* ptr, size_t size, true_type)
{
    container.reserve(container.size() + size);
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}

template <typename C, typename T>
void _append(C& container, T* ptr, size_t size, false_type)
{
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}

template <typename C, typename T>
void append(C& container, T* ptr, size_t size) 
{
    _append(container, ptr, size, integral_constant<bool, has_reserve<C>::value>{});
}
```
这个代码跟使用 enable_if 是等价的。当然在这个例子，标签分发并没有使用 enable_if 显得方便。可以把它当成一种可以替代 enable_if 的通用惯用法。

另外，如果我们用 void_t 那个版本的 has_reserve 模板的话，由于模板的实例会继承 false_type 或 true_type 之一，代码可以进一步简化为：
```cpp
template <typename C, typename T>
void append(C& container, T* ptr, size_t size)
{
    _append(container, ptr, size, has_reserve<C>{});
}
```

## 静态多态的限制？
为什么我们不能像在 Python 之类的语言里一样，直接写这样的代码呢？
```cpp
template <typename C, typename T>
void append(C& container, T* ptr, size_t size)
{
    if (has_reserve<C>::value) {
        container.reserve(container.size() + size);
    }
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}
```
在 C 类型没有 reserve 成员函数的情况下，编译是不能通过的，会报错。而在动态类型的语言里，只要语法没问题，缺成员函数要执行到那一行上才会被发现。