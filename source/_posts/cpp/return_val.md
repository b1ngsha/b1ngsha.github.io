---
title: 现代C++32讲：到底应不应该返回对象？
date: 2025-08-31 17:10:09
tags: C++
categories: C++
---
# F.20
《C++核心指南》的 F.20 这一条款是这么说的：
For "out" output values, prefer return values to ouput parameters

# 调用者负责管理内存，接口负责生成
一种常见的做法是，接口的调用者负责分配一个对象所需的内存并负责其生命周期，接口负责生成或修改该对象。这种做法意味着对象可以默认构造，代码一般使用错误码而非异常。
示例：
```cpp
MyObj obj;
ec = initialize(&obj);
```
这种做法和 C 是兼容的。一种略微 C++点的做法是使用引用代替指针，这样在上面的示例就不需要使用 & ；但这样只是语法略有区别，本质是一样的。

假如我们已有矩阵变量 A、B 和 C，要执行操作 R = A * B + C
那么在这种做法下代码大概会写成：
```cpp
error_code_t add(matrix *result, const matrix &lhs, const matrix &rhs);

error_code_t multiply(matrix *result, const matrix &lhs, const matrix &rhs);

int main()
{
    error_code_t ec;
    // ...
    matrix temp;
    ec = multiply(&temp, a, b);
    if (ec != SUCCESS)
    {
        goto end;
    }
    matrix r;
    ec = add(&r, temp, c);
    if (ec != SUCCESS)
    {
        goto end;
    }
    // ...
end:
    // ...
}
```

# 接口负责对象的堆上生成和内存管理
另外一种可能的做法是接口提供生成和销毁对象的函数，对象在堆上维护。注意这种做法一般不推荐由接口生成对象，然后由调用者通过调用 delete 来释放。在某些环境里，比如 Windows 上使用不同的运行时库时，这样做会引发问题（例如对象在模块 A 中用`new`分配，却在模块 B 中用`delete`释放）。
同样一个例子，代码大概会写成这样：
```cpp
matrix *add(const matrix &lhs, const matrix &rhs, error_code_t *ec);

matrix *multiply(const matrix &lhs, const matrix &rhs, error_code_t *ec);

void deinitialize(matrix **mat);

int main()
{
    error_code_t ec;
    // ...
    matrix *temp = nullptr;
    matrix *r = nullptr;
    temp = multiply(a, b, &ec);
    if (!temp)
    {
        goto end;
    }
    r = add(temp, c, &ec);
    if (!r)
    {
        goto end;
    }
end:
    if (temp)
    {
        deinitialize(&temp);
    }
    // ...
}
```
可以看到，虽然代码看似稍微自然了一点，但是啰嗦程度却增加了，原因是正确的处理需要考虑到各种不同错误路径下的资源释放问题。这里也没有使用异常，因为异常在这种表达下会产生内存泄露，除非用上一堆 try 和 catch，但那样异常在表达简洁性上的优势就没有了，没有实际的好处。

# 接口直接返回对象
最直截了当的代码，当然就是直接返回对象了：
```cpp
#include <armadillo>
#include <iostream>

using arma::imat22;
using std::cout;

int main()
{
    imat22 a{{1, 1}, {2, 2}};
    imat22 b{{1, 0}, {0, 1}};
    imat22 c{{2, 2}, {1, 1}};
    imat22 r = a * b + c;
    cout << r;
}
```
在实际执行中，没有复制发生，计算结果直接存放到了变量 r 上。更妙的是，因为矩阵大小是已知的，这儿不需要任何动态内存，所有对象及其数据全部存放在栈上。

# 如何返回一个对象？
一个用来返回的对象，通常应该是可移动构造/赋值的，一般也同时是可拷贝构造/赋值的。如果这样一个对象同时又可以默认构造，我们就称其为一个半正则的对象。如果可能的话，我们应当尽量让我们的类满足半正则这个要求。
半正则意味着我们的 matrix 类需要提供下面的成员函数：
```cpp
class matrix {
public:
    // 普通构造
    matrix(size_t rows, size_t cols);
    // 半正则要求的构造
    matrix();
    matrix(const matrix&);
    matrix(matrix&&);
    // 半正则要求的赋值
    matrix &operator=(const matrix&);
    matrix &operator=(matrix&&);
}
```

我们先来看一下在没有返回值优化的情况下，C++是怎样返回对象的。
以矩阵乘法为例，代码应该像这样：
```cpp
matrix operator*(const matrix &lhs, const matrix &rhs)
{
    if (lhs.cols() != rhs.rows())
    {
        throw runtime_error("sizes mismatch");
    }
    matrix result(lhs.rows(), rhs.cols());
    // ...
    return result;
}
```
注意对于一个本地变量，我们永远不应该返回其引用（或指针），不管是作为左值还是右值。从标准的角度，这会导致未定义行为，从实际的角度，这样的对象一般放在栈上可以被调用者正常覆盖使用的部分，随便一个函数调用或变量定义就可能覆盖这个对象占据的内存。这还是这个对象的析构不做事情的情况：如果析构函数会释放内存或破坏数据的话，那你访问到的对象即使内存没有被覆盖，也早就不是有合法数据的对象了。

回顾之前说到的，返回非引用类型的表达式结果是个纯右值。在执行`auto r = ...`的时候，编译器会认为我们实际上是在构造`matrix r(...)`，而`...`部分是一个纯右值。因此编译器会首先试图匹配`matrix(matrix&&)`，在没有时试图匹配`matrix(const matrix&)`。也就是说，也移动支持时使用移动，没有移动支持时则拷贝。

# 返回值优化（拷贝消除）
再来看一个能显示生命周期过程的对象的例子：
```cpp
class A
{
public:
    A() { cout << "Create A\n"; }
    ~A() { cout << "Destroy A\n"; }
    A(const A &) { cout << "Copy A\n"; }
    A(A &&) { cout << "Move A\n"; }
};

A getA_unnamed()
{
    return A();
}

int main()
{
    auto a = getA_unnamed();
}
```
即使完全关闭优化，三种主流编译器都只输出两行：
```shell
Create A
Destroy A
```

如果把代码稍微修改一下：
```cpp
A getA_named()
{
    A a;
    return a;
}

int main()
{
    auto a = getA_named();
}
```
现在虽然 GCC 和 Clang 的结果完全不变，但 MSVC 在非优化编译的情况下产生了不同地点输出：
```shell
Create A
Move A
Destroy A
Destroy A
```
也就是说，返回内容被移动构造了。

继续变形一下：
```cpp
A getA_duang()
{
    A a1;
    A a2;
    if (rand() > 42)
    {
        return a1;
    }
    else
    {
        return a2;
    }
}

int main()
{
    auto a = getA_duang();
}
```
这次返回值优化失效了：
```shell
Create A
Create A
Move A
Destroy A
Destroy A
Destroy A
```

再试试把移动构造函数删除：
```cpp
// A(A&&) { cout << "Move A\n"; }
```
我们可以看到：
```shell
Create A
Create A
Copy A
Destroy A
Destroy A
Destroy A
```
目前的结果变成拷贝构造了。

如果再进一步，把拷贝构造也标记为 delete 呢？是不是上面的 getA_unnamed、getA_named 和 getA_duang 都不能工作了？
在 C++之前确实是这样的。但从 C++17 开始，对于类似于 getA_unnamed 这样的情况，即使对象不可拷贝、不可移动，这个对象仍然是可以被返回的。C++17 要求对于这种情况，对象必须被直接构造在目标位置上，不经过任何拷贝或移动的步骤。

# 回到 F.20
理解了 C++ 里对返回值的处理和返回值优化之后，我们再回过头看一下 F.20 里陈述的理由的话，就显得很自然了：
A return value is self-documenting, whereas a & could be either in-out or out-only and is liable to be misused.

再来看一下 F.20 里描述的例外情况：
- 对于非值类型，比如返回值可能是子对象的情况，使用 unique_ptr 或 shared_ptr 来返回对象
- 对于移动代价很高的对象，考虑将其分配在堆上，然后返回一个句柄（如 unique_ptr），或传递一个非 const 的目标对象的引用来填充（用作输出参数）
- 要在一个内层循环里在多次函数调用中重用一个自带容量的对象：将其当做输入 / 输出参数并将其按引用传递