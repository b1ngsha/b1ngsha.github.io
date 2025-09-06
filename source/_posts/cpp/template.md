---
title: 现代C++32讲：编译期多态：泛型编程和模板入门
date: 2025-09-06 19:12:10
tags: C++
categories: C++
---

# 实例化模板
不管是类模版还是函数模板，编译器在看到其定义的时候只能做最基本的语法检查，真正的类型检查要在实例化的时候才能做，一般而言，这也是编译器会报错的时候。
模板还可以显式实例化和外部实例化。
显式实例化是程序员手动告诉编译器：在某个位置为某个模板生成特定类型的实例。例如：
```cpp
// vector_int.cpp
#include <vector>

// 显式实例化 vector<int>
template class std::vector<int>;

// 这会在当前生成 vector<int> 的所有成员函数
```

外部实例化是告诉编译器：这个模板的实例化在别处，不要在当前生成代码。例如：
```cpp
// main.cpp
#include <vector>
extern template class std::vector<int>; // 声明：不要在这里实例化

int main() {
    std::vector<int> v;
    v.push_back(42);

    // 不会在本文件中生成 vector<int> 的代码
    // 会链接到其他地方的实例
}
```
显式实例化和外部实例化通常在大型项目中可以用来集中模板的实例化，从而加速编译过程。

# 特化模板
如果我们需要使用的模板参数类型，不能完全满足模板的要求，该怎么办？
- 添加代码，让那个类型支持所需要的操作
- 对于函数模板，可以直接针对那个类型进行重载
- 对于类模板和函数模板，可以针对那个类型进行特化

以以下模板为例：
```cpp
template <typename E>
E my_gcd(E a, E b)
{
    while (b != E(0)) {
        E r = a % b;
        a = b;
        b = r;
    }
    return a;
}
```

对于 cln::cl_I 不支持 % 运算符的情况，以上三种方法我们都可以使用。
1. 添加 operator % 的实现
    ```cpp
    cln::cl_I operator%(const cln::cl_I& lhs, const cln::cl_I& rhs) 
    {
        return mod(lhs, rhs); 
    }
    ```
2. 针对 cl_I 进行重载
    首先修改 my_gcd 函数为：
    ```cpp
    template <typename E>
    E my_gcd(E a, E b)
    {
        while (b != E(0)) {
            E r = my_mod(a, b);
            a = b;
            b = r;
        }
        return a;
    }
    ```
    然后针对 cl_I 提供重载（同时提供通用的 my_mod 函数实现）：
    ```cpp
    cln::cl_I my_mod(const cln::cl_I& lhs, const cln::cl_I& rhs) 
    {
        return mod(lhs, rhs); 
    }
    ```
3. 针对 cl_I 进行特化
    ```cpp
    template <> 
    cln::cl_I my_mod<clm::cl_I>(const cln::cl_I& lhs, const cln::cl_I& rhs) 
    { 
        return mod(lhs, rhs); 
    }
    ```
    也可以直接特化 my_gcd 函数

在这个例子中，特化和重载在行为上没有本质的区别。就一般而言，特化是一种更通用的技巧，主要原因是特化可以用在类模板和函数模板上，而重载只能用于函数。
不过，通用而言：对函数使用重载，对类模板进行特化。

