---
title: 现代C++32讲：constexpr - 一个常态的世界
date: 2025-09-24 00:11:10
tags: C++
categories: C++
---
# 初识 constexpr
我们需要一个比模板元编程更方便的进行编译期计算的方法。
在 C++11 引入的、在 C++14 得到大幅改进的 constexpr 关键字就是为了解决这些问题而诞生的。它的字面意思是 constant expression，常量表达式。存在两类 constexpr 对象：
- constexpr 变量
- constexpr 函数
一个 constexpr 变量是一个编译时完全确定的常数。一个 constexpr 函数至少对于某一组实参可以在编译期间产生一个编译期常数，但它不保证在所有情况下都会产生一个编译期常数，因此也是可以作为普通函数来使用的。编译器也没法通用地检查这点。编译器唯一强制的是：constexpr 变量必须立即初始化，且初始化只能使用字面量或常量表达式，后者不允许调用任何非 constexpr 函数。

要检验一个 constexpr 函数能不能产生一个真正的编译期常量，可以把结果赋给一个 constexpr 变量。成功的话，我们就确认了至少在这种调研情况下，我们能真正得到一个编译期常量。

# constexpr 和编译期计算
更强大的地方在于，使用编译期常量，就跟我们之前的那些类模板里的 static const int 变量一样，是可以进行编译期计算的。

以前面 13 讲提到的阶乘函数为例，基本等价的写法是：
```cpp
constexpr int factorial(int n)
{
    if (n == 0) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}
```
这里有一个问题：在这个 constexpr 函数里，是不能写 static_assert(n >= 0) 的。一个 constexpr 函数仍然可以作为普通函数使用——显然，传入一个普通 int 是不能使用静态断言的。替换方法是在 factorial 的实现开头写入：
```cpp
if (n < 0) {
    throw std::invalid_argument("Arg must be non-negative");
}
```

# constexpr 和 const
那么 constexpr 和 const 的区别是什么？
const 在类型声明的不同位置会产生不同的结果。对于常见的 const char* 这样的类型声明，意义和 char const* 相同，是指向常字符的指针，指针指向的内容不可修改；但和 char* const 不同，那代表指向字符的常指针，指针本身不可修改。本质上，const 用来表示一个运行时常量。
const 后面渐渐带上了现在的 constexpr 用法，也代表编译期常数。现在在有了 constexpr 后，我们应该使用 constexpr 在这些用法中替换 const 了。从编译器的角度，为了向后兼容性，const 和 constexpr 在很多情况下还是等价的。但有时候，它们也有些细微的区别，其中之一为是否内联的问题。

# 内联变量
C++17 引入的内联（inline）变量的概念，允许在头文件中定义内联变量，然后像内联函数一样，只要所有的定义都相同，那变量的定义出现多次也没有关系。对于类的静态数据成员，const 缺省是不内联的，而 constexpr 缺省就是内联的。这种区别在你用 & 去取一个 const int 的地址、或将其传到一个形参类型为 const int& 的函数去的时候（在 C++文档中被称作 ODR-use），就会体现出来。
对于下面的程序：
```cpp
#include <iostream>
#include <vector>

struct magic {
    static const int number = 42;
};

int main()
{
    std::vector<int> v;
    // 调用 push_back(const T&)
    v.push_back(magic::number);
    std::cout << v[0] << std::endl;
}
```
程序在链接时就会报错了，说找不到 magic::number，这是因为 ODR-use 的类静态常量也需要有一个定义，在没有内联变量之前需要在某一个源代码文件中这样写：
```cpp
const int magic::number = 42;
```
必须正正好好一个，多了少了都不行，所以叫 one definition rule。内联函数，现在又有了内联变量以及模板，则不受这条规则限制。

修正这个问题的简单方法是把 magic 里的 static const 改成 static constexpr 或 static inline const。前者可行的原因是，类的静态 constexpr 成员变量默认就是内联的。const 常量和类外面的 constexpr 变量默认不内联，需要手工加 inline 关键字才会变成内联。

# constexpr 变量模板
变量模板是 C++14 引入的新概念。之前我们需要用类静态数据成员来表达的东西，使用变量模板可以更简洁地表达。constexpr 很适合用在变量模板里，表达一个和某个类型相关的编译期常量。由此，type traits 都获得了一种更简单的表示方式。再看一下我们之前用过的例子：
```cpp
template <class T>
inline constexpr bool is_trivially_destructible_v = is_trivially_destructible<T>::value;
```

# constexpr 变量仍是 const
一个 constexpr 变量仍然是 const 常类型。需要注意的是，就像 const char* 类型是指向常量的指针、自身不是 const 常量一样，下面这个表达式里的 const 也是不能缺少的：
```cpp
constexpr int a = 42;
constexpr const int& b = a;
```
第二行里，constexpr 表示 b 是一个编译期常量，const 表示这个引用是常量引用。去掉这个 const 的话，编译期就会认为你是试图将一个普通引用绑定到一个常数上，报一个类似下面的错误信息：
```bash
error: binding reference of type ‘int&’ to ‘const int’ discards qualiers
```

# constexpr 构造函数和字面类型
一个合理的 constexpr 函数，应当至少对某一组编译期常量的输入，能得到编译期常量的结果。为此，对这个函数也是有些限制的：
- 最早，constexpr 函数里连循环都不能有，后面在 C++14 放开了
- 目前，constexpr 函数仍不能有 try...catch 语句和 asm 声明，但到 C++20 会放开
- constexpr 函数里不能使用 goto
- ...
一个有意思的情况是类的构造函数。如果一个类的构造函数里面只包含常量表达式、满足对 constexpr 函数的限制的话（这意味着里面不可以有任何动态内存分配），并且类的析构函数是平凡的，那这个类就可以被称为是一个字面类型。换一个角度想，对 constexpr 函数，包括字面类型构造函数的要求是，得让编译器能在编译期进行计算，而不会产生任何“副作用”，比如内存分配、输入、输出等。

为了全面支持编译期计算，从 C++14 开始，很多标准类的构造函数和成员函数已经被标记为 constexpr，以便在编译期使用。当然，大部分的容器类，因为用到了动态内存分配，不能成为字面类型。下面这些不使用动态内存分配的字面类型则可以在变量表达式中使用：
- array
- initializer_list
- pair
- tuple
- string_view
- optional
- variant
- bitset
- complex
- chrono::duration
- chrono::time_point
- shared_ptr（仅限默认构造和空指针构造）
- unique_ptr（仅限默认构造和空指针构造）
- ...

下面这个例子可以展示上面的若干类及其成员函数的行为：
```cpp
#include <array>
#include <iostream>
#include <memory>
#include <string_view>

using namespace std;

int main()
{
    constexpr string_view sv{"hi"};
    constexpr pair pr{sv[0], sv[1]};
    constexpr array a{pr.first, pr.second};
    constexpr int n1 = a[0];
    constexpr int n2 = a[1];
}
```

# if constexpr
上一讲的结尾，我们给出了一个在类型参数 C 没有 reserve 成员函数时不能编译的代码，现在在 C++17 里面，我们只需要在 if 后面加上 constexpr，代码就能工作了：
```cpp
template <typename C, typename T>
void append(C& container, T* ptr, size_t size)
{
    if constexpr(has_reserve<C>::value) {
        container.reserve(container.size() + size);
    }
    for (size_t i = 0; i < size; ++i) {
        container.push_back(ptr[i]);
    }
}
```
当然，它要求括号里的条件是个编译期常量。满足这个条件后，标签分发、enable_if 那些技巧就没那么有用了，显然 if constexpr 这种写法可读性更强。