---
title: 现代C++32讲：右值和移动究竟解决了什么问题？
date: 2025-08-07 09:13:20
tags: C++
categories: C++
---

# 值分左右
我们常说 C++中有左值和右值，但标准里的定义其实更复杂，规定了以下这些值类别：
![image.png](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250805232934.png)
先来看`lvalue`和`rvalue`。
左值`lvalue`是有标识符、可以取地址的表达式，例如：
- 变量、函数或数据成员的名字
- 返回左值引用的表达式，如`++x`、`x = 1`、`cout << ''`
- 字符串字面量如`"hello world"`
在函数调用时，左值可以绑定到左值引用的参数，如`T&`。一个常量只能绑定到常左值引用，如`const T&`。

反之，纯右值`prvalue`是没有标识符、不可以取地址的表达式，一般也称之为“临时对象”。最常见的情况有：
- 返回非引用类型的表达式，如`x++`、`x + 1`，`make_shared(42)`
- 除字符串字面量之外的字面量，如 42、true

从 C++11 开始，C++中多了一种引用类型——右值引用。跟左值引用一样，我们可以用`const`和`volatile`来进行修饰，但最常见的情况是，我们不会用它们来修饰右值。
回想一下上一讲：
```cpp
template <typename U>
smart_ptr(const smart_ptr<U> &other) noexcept
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        other.shared_count_->add_count();
        shared_count_ = other.shared_count_;
    }
}

template <typename U>
smart_ptr(smart_ptr<U> &&other) noexcept
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        shared_count_ = other.shared_count_;
        other.ptr_ = nullptr;
    }
}
```
对于第二个函数，`other`是一个左值，虽然它是一个右值引用。拿这个`other`去调用函数时，它匹配的也会是左值引用，也就是说，**类型是右值引用的变量是一个左值**。

我们可以把`std::move(ptr1)`看作是一个有名字的右值。为了跟无名的纯右值`prvalue`区别，C++目前把这种表达式叫做`xvalue`。跟`lvalue`不同，`xvalue`依然是不能取地址的，所以它和`prvalue`都归为右值。

# 生命周期和表达式类型
一个临时对象会在保函这个临时对象的完整表达式估值完成后、按生成顺序的逆序被销毁，除非有生命周期延长发生。
我们先来看一个没有生命周期延长的基本情况：
```cpp
process_shape(circle(), triangle());
```
这里生成了两个临时对象，圆和三角形，它们会在`process_shape`执行完成并生成结果对象后被销毁。
可以用实际代码来演示这一行为：
```cpp
#include <stdio.h>

class shape
{
public:
    virtual ~shape() {}
};

class circle : public shape
{
public:
    circle() { puts("circle()"); }
    ~circle() { puts("~circle()"); }
};

class triangle : public shape
{
public:
    triangle() { puts("triangle()"); }
    ~triangle() { puts("~triangle()"); }
};

class result
{
public:
    result() { puts("result()"); }
    ~result() { puts("~result()"); }
};

result process_shape(const shape &shape1, const shape &shape2)
{
    puts("process_shape()");
    return result();
}

int main()
{
    puts("main()");
    process_shape(circle(), triangle());
    puts("something else");
}
```
执行结果为：
```bash
main()
circle()
triangle()
process_shape()
result()
~result()
~triangle()
~circle()
something else
```
可以看到临时对象`result`最后生成、最先析构。

为了方便对临时对象的使用，C++对临时对象有特殊的生命周期延长规则：如果一个`prvalue`被绑定到一个引用上，它的生命周期则会延长到跟这个引用变量一样长。
只要修改一行上面的代码就可以演示这个效果：
```cpp
result &&r = process_shape(circle(), triangle());
```
执行结果为：
```bash
main()
circle()
triangle()
process_shape()
result()
~triangle()
~circle()
something else
~result()
```
可以看到`result`的临时对象的生命周期被延长到了`main`的最后，与`r`变量相同。

这条规则只对`prvalue`有效，对`xrvalue`是无效的：
```cpp
result &&r = std::move(process_shape(circle(), triangle()));
```
这样会回到最初的情况，无法延长其生命周期。虽然执行到`something else`的地方我们仍然有一个有效的变量`r`，但它指向的对象已经不存在了，对`r`的解引用是一个未定义行为。由于`r`指向的是栈空间，通常不会立即导致程序崩溃，而会在某些复杂的组合条件下才会导致问题。

你可以把一个没有虚析构函数的子类对象绑定到基类的引用变量上，这个子类对象的析构仍然是正常的，因为这条规则只是延后了临时子类对象的析构而已，只要引用能绑定成功，类型就不会有什么影响。

# 移动的意义
对于前一讲中实现的`smart_ptr`，我们使用右值引用的目的是实现移动，而实现移动的意义是减少运行的开销，在引用计数指针场景下，这个开销并不大。移动构造和拷贝构造的差异仅在于：
1. 构造时少了一次`other.share_count_->add_count()`的调用
2. 析构时少了一次`shared_count_->reduce_count()`的调用

在使用容器类的情况下，移动更有意义。可以分析下下面这个语句：
```cpp
string result = string("Hello,") + name + ".";
```
在 C++11 之前，它会引入很多额外开销，以下的操作都会生成一个临时对象：
1. `string(const char*)`
2. `operator+(const string&, const string&)`
3. `operator+(const string&, const char*)`（生成的对象会直接赋值给`result`）
并会倒序析构 2 和 1 这两个临时对象。

开销更小的写法：
```cpp
string result = "Hello,";
result += name;
result += ".";
```
这样只会调用一次构造函数和两次`string::operator+=`，没有任何临时对象需要生成和析构，但显然代码就啰嗦多了。
从 C++11 开始，这不再是必须的，上面那个单行的语句执行流程会变成这样：
1. `string(const char*)`生成临时对象1
2. `operator+(string&&, const string&)`直接在临时对象 1 上执行追加动作，并把结果移动到临时对象 2
3. `operator+(string&&, const char*)`直接在临时对象 2 上追加，并把结果移动到`result`
4. 析构临时对象 2
5. 析构临时对象 1
性能上，所有的字符串只复制了一次。

# 如何实现移动？
通常需要下面几步：
1. 有分开的拷贝构造和移动构造，除非你打算只支持移动
2. 有`swap`函数，支持和另外一个对象快速交换成员
3. 对象的同个命名空间下，应有一个全局的`swap`函数，用于实现对这个对象的交换
4. 通用的`operator=`（通常我们需要将其实现成对`a=a;`这样的写法安全）
上面各个函数如果不抛异常，应当标为`noexcept`。

# 不要返回本地变量的引用
有一种常见的 C++编程错误，是在函数里返回一个本地对象的引用。由于在函数结束时本地对象即被销毁，返回一个指向本地对象的引用属于未定义的行为。
在 C++11 之前，返回一个本地对象意味着这个对象会被拷贝，除非编译器发现可以做返回值优化，能把对象直接构造到调用者的栈上。而从 C++11 开始，返回值优化仍然会发生，但如果没有发生的情况下，编译器会试图将本地对象移动出去，而不是拷贝出去。
这一行为不需要手动调用`std::move`，这不会对移动产生帮助，反而可能影响返回值优化。

# 引用坍缩和完美转发
我们已经知道，对于一个类型 T，它的左值引用是`T&`，右值引用是`T&&`，那么：
是不是`T&`就一定是一个左值引用？
是不是`T&&`就一定是一个右值引用？
对于前者是，对于后者不是。

关键在于，在有模板的代码里，对于类型参数的推导结果可能是引用。我们可以略过一些复杂的语法规则，要点是：
如果 T 是左值引用，那么`T&&`的结果仍然是左值引用，即`type&&&`坍缩成了`type&`。
如果 T 是一个实际类型，那么`T&&`的结果自然就是一个右值引用。

实际上，很多标准库里的函数，连目标的参数类型都不知道，但我们仍然需要能够保持参数的值类别：左值仍然是左值，右值仍然是右值。这个功能在 C++中已经提供了，叫`std::forward`。
因此，如果我们有两个这样的函数：
```cpp
void bar(const shape &s)
{
    puts("bar(const shape&)");
    foo(s);
}

void bar(shape &&s)
{
    puts("bar(shape&&)");
    foo(s);
}
```
就可以简单写为：
```cpp
template <typename T>
void bar(T &&s) 
{
    foo(std::forward<T>(s));
}
```

当 T 作为模板参数时，`T&&`的作用主要是保持值类别进行转发，它还有一个名字叫“转发引用”，因为既可以是左值引用，也可以是右值引用。