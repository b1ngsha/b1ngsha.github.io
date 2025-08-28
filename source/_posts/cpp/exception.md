---
title: 现代C++32讲：异常 - 用还是不用，这是个问题
date: 2025-08-10 22:07:59
tags: C++
categories: C++
---

如果你不知道到底该不该用异常的话，那答案就是该用。如果你需要避免使用异常，原因必须是你有明确的需要避免使用异常的理由。

# 没有异常的世界
先来看看没有异常的世界是什么样子的，最典型的情况就是 C 了。
假设我们要做一些矩阵的操作，定义了下面这个矩阵的数据结构：
```cpp
typedef struct
{
    float *data;
    size_t nrows;
    size_t ncols;
} matrix;
```
初始化和清理的函数：
```cpp
enum matrix_err_code
{
    MATRIX_SUCCESS,
    MATRIX_ERR_MEMORY_INSUFFICIENT,
    MATRIX_ERR_MISMATCHED_MATRIX_SIZE,
};

int matrix_alloc(matrix *ptr, size_t nrows, size_t ncols)
{
    size_t size = nrows * ncols * sizeof(float);
    float *data = (float *)malloc(size);
    if (data == NULL)
    {
        return MATRIX_ERR_MEMORY_INSUFFICIENT;
    }
    ptr->data = data;
    ptr->nrows = nrows;
    ptr->ncols = ncols;
}

void matrix_dealloc(matrix *ptr)
{
    if (ptr->data == NULL)
    {
        return;
    }
    free(ptr->data);
    ptr->data = NULL;
    ptr->nrows = 0;
    ptr->ncols = 0;
}
```
假设我们需要做矩阵乘法，那么函数实现大概会是像这样：
```cpp
int matrix_multiply(matrix *result, const matrix *lhs, const matrix *rhs)
{
    int errcode;
    if (lhs->ncols != rhs->nrows)
    {
        return MATRIX_ERR_MISMATCHED_MATRIX_SIZE;
    }
    errcode = matrix_alloc(result, lhs->nrows, rhs->ncols);
    if (errcode != MATRIX_SUCCESS)
    {
        return errcode;
    }
    // ...
    return MATRIX_SUCCESS;
}
```
调用代码大概像这样：
```cpp
matrix c;
memset(&c, 0, sizeof(matrix));

errcode = matrix_multiply(&c, &a, &b);
if (errcode != MATRIX_SUCCESS)
{
    goto error_exit;
}
// ...
error_exit:
    matrix_dealloc(&c);
    return errcode;
}
```
可以看到，我们需要大量判断错误的代码，并且会零散分布在代码各处。

那我们用 C++，不用异常可以吗？
可以，但是也好不了多少。因为 C++的构造函数是不能返回错误码的，所以根本不能用构造函数来做可能会出错的事情。你只能定义一个构造函数，再使用一个`init`函数来做真正的构造操作。

# 使用异常
如果使用异常，那么我们就可以在构造函数里面做真正的初始化工作了。假设我们的矩阵类有下列的数据成员：
```cpp
class matrix
{
private:
    float *data_;
    size_t nrows_;
    size_t ncols_;
};
```
构造函数：
```cpp
matrix(size_t nrows, size_t ncols) : nrows_(nrows), ncols_(ncols)
{
    data_ = new float[nrows * ncols];
}
```
析构函数：
```cpp
~matrix()
{
    delete[] data_;
}
```
乘法函数：
```cpp
friend matrix operator*(const matrix &lhs, const matrix &rhs)
{
    if (lhs.ncols_ != rhs.nrows_)
    {
        throw std::runtime_error("matrix sizes mismatch");
    }
    matrix result(lhs.nrows_, rhs.ncols_);
    // ...
    return result;
}
```
现在使用乘法的代码就很简单了，直接用`matrix = a * b`就可以。
但是现在这段代码跟之前的区别好像只有一个`throw`，跟前面的 C 代码能等价吗？
异常处理并不意味着需要写显式的`try`和`catch`。异常安全的代码，可以没有任何`try`和`catch`。
如果你不确定什么是“异常安全”，我们先来温习一下概念：异常安全是指当异常发生时，**既不会发生资源泄露，系统也不会处于一个不一致的状态。**

我们来看看这个例子中可能会出现错误/异常的地方：
1. 内存分配。如果`new`出错，按照 C++的规则，一般会得到异常`bad_alloc`，对象的构造也就失败了。那这种情况下，在`catch`捕获到这个异常之前，所有的栈上对象会全部被析构，资源全部被自动清理。
2. 如果矩阵的长宽不符合做乘法，我们主动抛出了异常，对象根本不会被构造。
3. 如果a，b是本地变量，然后乘法失败了呢？析构函数会自动释放其空间，我们同样不会有任何资源泄露。
总而言之，只要我们适当地组织好代码、利用好 RAII，实现矩阵的代码和使用矩阵的代码都可以更短、更清晰。我们可以统一在外层某个地方处理异常——通常会记日志、或在界面上向用户报告错误了。

# 异常的问题
对它的批评主要有两条：
- 异常违反了“你不使用就不需要付出代价”的 C++原则。只要开启了异常，即使不使用异常你编译出的二进制代码通常也会膨胀。
- 异常比较隐蔽，不容易看出来哪些地方会发生异常和发生什么异常。
对于第一条，这实际上也算是 C++实现的一个折中了。目前的主流异常实现中，都倾向于牺牲可执行文件大小、提高 happy path 的性能。只要程序不抛异常，C++代码的性能比起完全不做错误检查的代码，都只有几个百分点的性能损失。除了非常有限的一些场景，可执行文件的大小通常不会是个问题。
第二条可以算作一个真正有效的批评。和 Java 不同，C++里不会对异常规约进行编译时的检查。从 C++17 开始，C++甚至完全禁止了以往的动态异常规约，你不能再在函数声明里写你可能会抛出某某异常。你唯一能声明的就是某函数不会抛出异常，这也是 C++的运行时唯一会检查的东西了。如果一个函数声明了不会抛出异常、结果却抛出了，C++运行时会调用`std::terminate`来终止应用程序。不管是程序员的声明，还是编译器的检查，都不会告诉你哪些函数会抛出哪些异常。
当然，不声明异常是有理由的，特别是在泛型编程的代码里几乎不可能预知到会发生什么异常。

一些避免异常带来问题的建议：
- 写异常安全的代码，尤其在模板里。可能的话，提供强异常安全保证，在任何第三方代码发生异常的情况下，不改变对象的内容，也不产生任何资源泄露。
- 如果你的代码可能抛出异常的话，在文档里明确声明可能发生的异常类型和发生条件。
- 对于肯定不会抛出异常的代码，将其标为`noexcept`。注意类的特殊成员（构造函数、析构函数、赋值函数等）会自动成为`noexcept`，如果它们调用的代码都是`noexcept`的话。所以，像`swap`这样的成员函数应当尽可能标成`noexcept`。

# 使用异常的理由
后面会学习到一些不使用异常、也不使用错误返回码的错误处理方式，但异常是渗透在 C++中的标准错误处理方式。标准库的错误处理方式就是异常。其中不仅包括运行时错误，甚至包括一些逻辑错误。
比如容器在能使用`[]`运算符的地方，也提供了`at`成员函数，**能够在下标不存在的时候抛出异常，作为一种额外的帮助调试手段。**

C++的标准容器在大部分情况下提供了强异常保证，即：一旦异常发生，现场会恢复到调用函数之前的状态，容器的内容不会发生改变，也没有任何资源泄漏。前面提到过，vector 会在元素类型没有提供保证不抛异常的移动构造函数的情况下，在移动元素时使用拷贝构造函数。这是因为一旦某个操作发生了异常，被移动的元素已经被损坏，处于只能析构的状态，异常安全性就得不到保证了。

只要你使用了标准容器，不管你自己用不用异常，你都得处理标准容器可能引发的异常——至少有 `bad_alloc`，除非你明确知道你的目标运行环境不会产生这个异常。
