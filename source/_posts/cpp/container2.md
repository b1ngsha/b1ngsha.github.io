---
title: 现代C++32讲：容器汇编 II - 需要函数对象的容器
date: 2025-08-10 20:01:44
tags: C++
categories: C++
---

# 函数对象及其特化
首先来讨论一下两个重要的函数对象，`less`和`hash`。
先看一下`less`，小于关系。在标准库里，通用的`less`大致是这样定义的：
```cpp
template <class T>
struct less : binary_function<T, T, bool>
{
    bool operator()(const T &x, const T &y) const
    {
        return x < y;
    }
};
```
`less`是一个函数对象，并且是一个二元函数，执行对任意类型的值的比较，返回布尔类型。作为函数对象，它定义了函数调用运算符（`operator()`），并且缺省行为是对指定类型的对象进行`<`的比较操作。
在需要大小比较的场合，C++通常默认会使用`less`，包括我们今天会讲到的若干容器和排序算法`sort`。如果我们需要产生相反的顺序的话，则可以使用`greater`，大于关系。

计算哈希值的函数对象`hash`就不一样了。它的目的是把一个某种类型的值转换成一个无符号整数哈希值，类型为`size_t`。它没有一个可用的默认实现。对于常用的类型，系统提供了需要的特化，类似于：
```cpp
template <class T>
struct hash;

template <>
struct hash<int> : public unary_function<int, size_t>
{
    size_t operator()(int v) const noexcept
    {
        return static_cast<size_t>(v);
    }
};
```
对于每个类，类的作者都可以提供 hash 的特化，使得对于不同的对象值，函数调用运算符都能得到尽可能均匀分布的不同数值。

# priority_queue
它用到了比较函数对象，默认是`less`。它和 stack 类似，但容器内的顺序是排序的结果。在使用缺省的`less`作为`Compare`模板参数时，最大的数值会出现在容器的“顶部”。

# 关联容器
关联容器有set、map、multiset 和 multimap。在 C++里关联容器被认为是有序的，会根据 key 来进行排序。如果在声明关联容器时没有提供比较类型的函数，缺省使用`less`来进行排序。如果 key 的类型提供了比较运算符`<`的重载，我们不需要做任何额外的工作。否则，我们就需要对 key 类型做`less`的特化，或者提供一个其他的函数对象类型。
名字带"multi"的允许key 重复，不带的则不允许。

# 无序关联容器
从 C++11 开始，每个关联容器都有一个对应的无序关联容器，它们是：
- unordered_set
- unordered_map
- unordered_multiset
- unordered_multimap
它们不要求提供一个排序的函数对象，而要求一个可以计算哈希值的函数对象，我们一般用标准的`hash`函数对象及其特化。
例如：
```cpp
namespace std
{
    template <typename T>
    struct hash<std::complex<T>>
    {
        size_t operator()(const std::complex<T> &v) const noexcept
        {
            hash<T> h;
            return h(v.real()) + h(v.imag());
        }
    };
}
```
这里在 std 名空间中添加了特化，这是少数用户可以向 std 名空间添加内容的情况之一。正常情况下，向 std 名空间添加声明或定义是禁止的，属于未定义行为。
关联容器和 priority_queue的插入和删除操作，以及关联容器的查找操作，其复杂度都是 O(log(n))，而无序关联容器的实现使用哈希表，可以达到O(1)。但是这取决于是否用了一个好的哈希函数：在哈希函数选择不当的情况下，无序关联容器的插入、删除、查找性能可能退化为 O(n)。

# array
C++17直接提供了一个 `size`方法，可以用于提供数组长度，并且在数组退化成指针的情况下会直接失败：
```cpp
#include <iostream>
#include <iterator>

void test(int arr[])
{
    // 不能编译
    // std::cout << std::size(arr) << std::endl;
}

int main()
{
    int arr[] = {1, 2, 3, 4, 5};
    std::cout << "The array length is " << std::size(arr) << std::endl;
    test(arr);
}
```
此外，C 数组也没有良好的复制行为，你无法用 C 数组作为 map 或 unordered_map的 key 类型，array 类型则可以。