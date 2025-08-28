---
title: 现代C++32讲：易用性改造 II - 字面量、静态断言和成员函数说明符
date: 2025-08-25 00:19:38
tags: C++
categories: C++
---

# 字面量
C++11引入了自定义字面量，可以使用`operator""`后缀，来将用户提供的字面量转换为实际的类型。

 示例：
```cpp
#include <chrono>
#include <complex>
#include <iostream>
#include <string>
#include <thread>

using namespace std;
int main()
{
    cout << "i * i = " << 1i * 1i << endl; // 1i 是一个复数虚数单位字面量，表示 std::complex<double>(0.0, 1.0)
    cout << "Waiting for 500ms" << endl;
    this_thread::sleep_for(500ms); // 500ms 是一个时间字面量
    cout << "Hello world"s.substr(0, 5) << endl; // "..."s 是一个字符串字面量后缀，将 C 风格字符串转换为 std::string
}
```
这里为了方便，直接导入了 `std` 命名空间，但正常情况其实应该在字面量的作用域里导入需要的命名空间。

要在自己的类里面支持字面量，唯一的限制是非标准的字面量后缀必须以下划线`_`打头。例如：
```cpp
struct length
{
    double value;
    enum unit
    {
        metre,
        kilometre,
        millimetre,
        centimetre,
        inch,
        foot,
        yard,
        mile
    };
    static constexpr double factors[] = {
        1.0, 1000.0, 1e-3, 1e-2, 0.0254, 0.3048, 0.9144, 1609.344};

    explicit length(double v, unit u = metre)
    {
        value = v * factors[u];
    }
};

length operator"" _m(long double v)
{
    return length(v, length::unit::metre);
}
```

# 二进制字面量
从 C++14 开始，对于二进制也有了直接的字面量：
```cpp
unsigned mask = 0b11100000;
```

但是，I/O streams 里只有dec、hex、oct 三个操纵器，而没有 bin，因而输出一个二进制数不能像十进制、十六进制、八进制那么直接。
一个间接方式是用 biteset，但调用者需要手动指定二进制位数：
```cpp
cout << bitset<9>(mask) << endl;
```

# 数字分隔符
C++14 开始，允许在数字型字面量转换任意添加`'`来使其更可读：
```cpp
unsigned mask = 0b111'000'000;
```

# 静态断言
C++98的 assert 允许在运行时检查一个函数的前置条件是否成立，但是没有一种方法允许开发人员在编译的时候就检查假设是否成立。
C++11 直接从语言层面提供了静态断言机制：
```cpp
static_assert((alignment & (alignment - 1)) == 0, "Alignment must be power of two");
```

# override和final说明符
它们仅在出现在函数声明尾部时起作用，不影响我们使用这两个词作变量名等其他用途。

override 显式声明了成员函数是一个虚函数且覆盖了基类中的该函数。如果有 override 声明的函数不是虚函数，或基类中不存在这个虚函数，编译器会报告错误。这个说明符的主要作用有两个：
- 给开发人员更明确的提示，这个函数覆写了基类的成员函数；
- 让编译器进行额外的检查，防止程序员由于拼写错误或代码改动没有让基类和派生类中的成员函数名称完全一致。

final 则声明了成员函数是一个虚函数，且该虚函数不可在派生类中被覆盖。如果有一点没有得到满足的话，编译器就会报错。还有一个作用是标志某个类或结构不可被派生。同样，这时应将其放在被定义的类或结构名后面。
