---
title: 现代C++32讲：实现C++智能指针
date: 2025-08-05 22:26:05
tags: C++
---

首先，以下代码可以完成智能指针的最基本功能：对超出作用域的对象进行释放。
```cpp
template <typename T>
class smart_ptr
{
public:
    explicit smart_ptr(T *ptr = nullptr) : ptr_(ptr) {}
    ~smart_ptr() { delete *ptr_; }
    T *get() const { return ptr_; }

private:
    T *ptr_;
};
```
> 这里的`explicit`的作用是禁用隐式转换，必须显式地调用构造函数。

但它缺少了一些东西：
1. 该类对象的行为不够像指针（通过`->`和`*`的方式进行操作）
2. 拷贝该类对象会引发程序行为异常

对于第一点比较容易解决，增加几个成员函数就可以：
```cpp
T &operator*() const { return *ptr_; }
T *operator->() const { return ptr_; }
operator bool() const { return ptr_; }
```

## 拷贝构造和赋值
而对于拷贝构造和赋值，我们就需要思考该如何定义其行为。假设对于：
```cpp
smart_ptr<shape> ptr2{ptr1};
```
在第二行中，我们应该如何定义这里的行为？

在拷贝智能指针时把对象也拷贝一份？通常不会这么做，因为使用智能指针的目的就是要减少对象的拷贝。

在拷贝时转移指针的所有权？
```cpp
template <typename T>`
class smart_ptr
{
// ...
public:
    smart_ptr(smart_ptr &other) { ptr_ = other.release(); }
    smart_ptr &operator=(smart_ptr &other)
    {
        smart_ptr(other).swap(*this);
        return *this;
    }
    T *release()
    {
        T *ptr = ptr_;
        ptr_ = nullptr;
        return ptr;
    }
    void swap(smart_ptr &other)
    {
        using std::swap; // using ADL
        swap(ptr_, other.ptr_);
    }
    // ...
};
```
> 这里有一个优化细节，利用`using std::swap`和无命名空间限定的`swap`调用，来启用一种能让编译器通过 ADL 自动发现并使用最优`swap`函数的编程模式。如果找不到最优的，它也会回退到使用标准的`std::swap`。
> 并且在赋值函数的实现中保证了强异常安全性：赋值分为拷贝构造和交换两步，异常只可能在第一步发生；而如果第一步发生了异常，那么也不会对当前的`*this`产生影响。

实际上，这就是 C++98 的 `auto_ptr` 的定义，它在 C++17 时已经被删除了。它的问题是如果一不小心把一个`smart_ptr`传递给了另一个，那你就不再拥有原先的`smart_ptr` 了。

## “移动”指针
接下来，可以尝试用“移动”来改善一下`smart_ptr`的行为：
```cpp
smart_ptr(smart_ptr &&other) { ptr_ = other.release(); }
smart_ptr &operator=(smart_ptr other)
{
    other.swap(*this);
    return *this;
}
```
1. 把拷贝构造函数中的参数从`smart_ptr&`（引用）改为了`smart_ptr&&`（右值引用），现在它变成了移动构造函数；
2. 把赋值函数中的参数类型从`smart_ptr&`改为了`smart_ptr`，也就是说现在在构造参数时就会直接生成一个临时的智能指针，不再需要在函数体中构造临时对象。

根据 C++的规则，这里提供了移动构造函数，而没有显式提供拷贝构造函数，那么后者将会被自动禁用。
```cpp
smart_ptr ptr1{new int(42)};
smart_ptr ptr2{ptr1}; // 编译出错（直接调用拷贝构造）
smart_ptr ptr3;
ptr3 = ptr1; // 编译出错（调用赋值函数，构造参数时调用了拷贝构造）
ptr3 = std::move(ptr1); // 编译通过（显式构造右值引用）
smart_ptr ptr4{std::move(ptr3)}; // 编译通过（显式构造右值引用）
```

## 子类指针向基类指针的转换
我们知道，一个`circle*`是可以隐式转换为`shape*`的，但是现在我们的`smart_ptr`却没办法做`smart_ptr<circle>`到`smart_ptr<shape>`这样的转换，行为还是不够“自然”。
不过，只需要增加一个构造函数，就能够实现这一行为：
```cpp
template <typename U>
smart_ptr(smart_ptr<U>&& other)
{
    ptr_ = other.release();
}
```
对于不正确的转换则会在代码编译时直接报错。
需要注意，上面这个构造函数不会被编译器看作移动构造函数，因此不能自动触发删除拷贝构造函数的行为。

## 引用计数
`unique_ptr`只能指向一个对象，这显然不能满足所有使用场合的需求。更常见的情况是，多个智能指针同时拥有一个对象，当它们全部都失效时，这个对象也同时会被删除，这也就是`shared_ptr`了。
多个`shared_ptr`在共享同一对象时也需要同时共享同一个计数。

```cpp
class shared_count
{
public:
    shared_count() : count_(1) {}
    void add_count() { ++count_; }
    long reduce_count() { return --count_; }
    long get_count() const { return count_; };

private:
    long count_;
};
```
增加计数的方法不需要返回计数值；但减少计数时需要返回计数值，以供调用者判断是否它已经是最后一个指向共享计数的`shared_ptr`了。

现在我们可以实现带引用计数的智能指针了。
```cpp
template <typename T>
class smart_ptr
{
public:
    explicit smart_ptr(T *ptr = nullptr) : ptr_(ptr)
    {
        if (ptr_)
        {
            shared_count_ = new shared_count();
        }
    }
    ~smart_ptr()
    {
        if (ptr_ && !shared_count_->reduce_count())
        {
            delete ptr_;
            delete shared_count_;
        }
    }

private:
    T *ptr_;
    shared_count *shared_count_;
};
```
构造函数会同步构造一个`shared_count`出来，析构函数则会在`ptr_`非空时，将引用数减一，并在引用数降到零时删除对象和共享计数。

```cpp
smart_ptr(smart_ptr &&other)
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        shared_count_ = other.shared_count_;
        other.ptr_ = nullptr;
    }
}

template <typename U>
smart_ptr(smart_ptr<U> &&other)
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        shared_count_ = other.shared_count_;
        other.ptr_ = nullptr;
    }
}

smart_ptr(const smart_ptr &other)
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        other.shared_count_->add_count();
        shared_count_ = other.shared_count_;
    }
}

template <typename U>
smart_ptr(const smart_ptr<U> &other)
{
    ptr_ = other.ptr_;
    if (ptr_)
    {
        other.shared_count_->add_count();
        shared_count_ = other.shared_count_;
    }
}
```
对于拷贝构造的情况，则需要同步将引用计数加一；对于移动构造的情况，则将`other`的指向去掉即可。
不过对于上面的代码而言有个问题，在以下情况会编译报错：
```cpp
smart_ptr<circle> p(new int(42));
smart_ptr<shape> q(p);
```
因为在跨类型的实例之间不天然就有`friend`关系，因此不能互相访问私有成员`ptr_`和`shared_count_`，我们需要在`smart_ptr`中显式说明：
```cpp
template <typename U>
friend class smart_ptr;
```

别忘了在`swap`中补充对`shared_count_`的交换：
```cpp
void swap(smart_ptr &other)
{
    using std::swap;
    swap(ptr_, other.ptr_);
    swap(shared_count_, other.shared_count_);
}
```

此外，之前的实现中用`release`来手工释放所有权的形式在当前场景下就不太合适了，应当删除。但我们可以加一个对调试非常有用的方法，返回引用计数值，如下：
```cpp
long use_count() const
{
    if (ptr_)
    {
        return shared_count_->get_count();
    }
    return 0;
}
```

接下来就可以验证下功能是否正常：
```cpp
int main()
{
    smart_ptr<circle> ptr1(new circle());
    printf("use count of ptr1 is %ld\n", ptr1.use_count());

    smart_ptr<shape> ptr2;
    printf("use count of ptr2 was %ld\n", ptr2.use_count());

    ptr2 = ptr1;
    printf("use count of ptr2 is now %ld\n", ptr1.use_count());

    if (ptr1)
    {
        puts("ptr1 is not empty");
    }
}
```

输出结果为：
```bash
use count of ptr1 is 1
use count of ptr2 was 0
use count of ptr2 is now 2
ptr1 is not empty
~circle()
```
可以看到引用计数的变化，以及最后对象被成功删除。

## 指针类型转换
对应 C++中不同的强制类型转换，智能指针也需要实现类似的函数模板。需要注意的就是将智能指针内部的指针进行类型转换后，别忘了对引用计数的变更。
添加一个构造函数用于类型转换：
```cpp
template <typename U>
smart_ptr(const smart_ptr<U> &other, T *ptr)
{
    ptr_ = ptr;
    if (ptr_)
    {
        other.shared_count_->add_count();
        shared_count_ = other.shared_count_;
    }
}
```
实现一个`dynamic_pointer_cast`作为示例，其它几个的逻辑都是一样的：
```cpp
template <typename T, typename U>
smart_ptr<T> dynamic_pointer_cast(const smart_ptr<U> &other)
{
    T *ptr = dynamic_cast<T *>(other.get());
    return smart_ptr<T>(other, ptr);
}
```
验证：
```cpp
smart_ptr<circle> ptr3 = dynamic_pointer_cast<circle>(ptr2);
printf("use count of ptr3 is %ld\n", ptr3.use_count());
```
输出结果：
```bash
use count of ptr3 is 3
```