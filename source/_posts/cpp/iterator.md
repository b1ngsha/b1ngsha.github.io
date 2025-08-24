---
title: 现代C++32讲：迭代器和好用的新 for 循环
date: 2025-08-24 17:36:47
tags: C++
---

# 什么是迭代器？
迭代器是一个很通用的概念，并不是一个特定的类型。它实际上是一组对类型的要求。
对容器的`begin`和`end`成员函数返回的对象类型提出以下要求，假设前者返回的类型是 I，后者返回的类型是 S，那么这些要求是：
- I 对象支持`*`操作，解引用取得容器内的某个对象
- I 对象支持`++`指向下一个对象，同时支持前置和后置`++`
- I 对象可以和 I 或者 S 对象进行相等比较，判断是否遍历到了特定位置
在 C++17 之前，`begin`和`end`返回的类型 I 和 S 必须是相同的。从 C++17 开始，它们可以是不同的类型。
上面的类型 I，多多少少就是一个满足输入迭代器的类型了。

输入迭代器不要求对同一迭代器可以多次使用`*`运算符，也不要求可以保存迭代器来重新遍历对象，换句话说，只要求可以单次访问。如果取消这些限制、允许多次访问的话，那迭代器同时满足了前向迭代器。

一个前向迭代器的类型，如果同时支持--（前置及后置），回到前一个对象，那它就是个双向迭代器。

一个双向迭代器，如果额外支持在整数类型上的`+、-、+=、-=`，跳跃式地移动迭代器；支持`[]`，数组式的下标访问；支持迭代器的大小比较；那它就是个随机访问迭代器。

一个随机访问迭代器 i 和一个整数 n，在`*i`可解引用且`i+n`是合法迭代器的前提下，如果额外还满足`(addressof(i) + n)`等价于`*(i+n)`，即保证迭代器指向的对象在内存里是连续存放的，那它就是个连续迭代器。

以上这些迭代器只考虑了读取。如果一个类型像输入迭代器，但`*i`只能作为左值来写而不能读，那它就是个输出迭代器。

而比输入迭代器和输出迭代器更底层的概念，就是迭代器了。基本要求是：
- 对象可以被拷贝构造、拷贝赋值和析构
- 对象支持`*`运算符
- 对象支持前置`++`运算符

迭代器通常是对象。但需要注意的是，指针可以满足上面所有的迭代器要求，因而也是迭代器。因为本来迭代器就是根据指针的特性对其进行抽象的结果。事实上，vector 的迭代器，在很多实现里就直接是使用指针的。

# 常用迭代器
最常用的迭代器就是容器的`iterator`类型了。以我们学过的顺序容器为例，它们都定义了嵌套的`iterator`类型和`const_iterator`类型。一般而言，`iterator`可写入，`const_iterator`类型不可写入，但这些迭代器都被定义为输入迭代器或其派生类型：
- `vector::iterator`和`array::iterator`可以满足到连续迭代器
- `deque::iterator`可以满足到随机访问迭代器（它的内存只有部分连续）
- `list::iterator`可以满足到双向迭代器（链表不能快速跳转）
- `forward_list::iterator`可以满足到前向迭代器（单向链表不能反向遍历）
很常见的一个输出迭代器是`back_inserter`返回的类型`back_inserter_iterator`，用它我们可以很方便地在容器的尾部进行插入操作。另外一个常见的输出迭代器的`ostream_iterator`，方便我们把容器内容“拷贝”到一个输出流。

# 使用输入行迭代器
C++11 进入了基于范围的 for 循环，就可以把遍历输入流的代码以一种自然、简洁的方式写出来。
```cpp
for (const std::string &line : istream_line_reader(is))
{
    std::cout << line << std::endl;
}
```
这里会获取迭代器，生成迭代器的这一步的具体规则是：
- 对于 C 数组，编译器会自动生成指向数组头尾的指针。
- 对于有`begin`和`end`成员的对象，编译器会调用其`begin`和`end`成员函数。
- 否则，编译器会尝试在对象所在的命名空间寻找可以用于它的`begin`和`end`函数并调用；找不到的话则失败报错。
# 定义输入行迭代器
下面来看看，如果要实现一个输入行迭代器，需要做些什么工作。
C++里有些固定的类型要求规范。对于一个迭代器，我们需要定义下面的类型：
```cpp
#include <iterator>
#include <string>

class istream_line_reader
{
public:
    class iterator // 实现 InputIterator
    {
    public:
        typedef ptrdiff_t difference_type;
        typedef std::string value_type;
        typedef const value_type *pointer;
        typedef const value_type &reference;
        typedef std::input_iterator_tag iterator_category;
    };
};
```
仿照一般的容器，我们把迭代器定义为`istream_line_reader`的嵌套类。它里面的这五个类型是必须定义的。其中：
- `difference_type`是代表迭代器之间距离的类型，定义为`ptrdiff_t`只是种标准做法（指针间差值的类型），对这个类型没什么特别作用。
- `value_type`是迭代器指向的对象的值类型，我们使用`string`，表示迭代器指向的是字符串。
- `pointer`是迭代器指向的对象的指针类型，这里就简单定义为`value_type`的常指针了。
- 类似地，`reference`是`value_type`的常引用。
- `iterator_category`被定义为`input_iterator_tag`，标识这个迭代器的类型是`input iterator`。

作为一个真的只能读一次的输入迭代器，有个特殊的麻烦：到底应该让`*`负责读取还是`++`负责读取。我们这里采用常见、也较为简单的做法，让`++`负责读取，`*`负责返回读取的内容。这样的话，这个`iterator`类需要有一个成员指向输入流，一个成员来存放读取的结果。根据这个思路，我们定义这个类的基本成员函数和数据成员：
```cpp
#include <iterator>
#include <string>

class istream_line_reader
{
public:
    class iterator // 实现 InputIterator
    {
    public:
        // ...
        iterator() noexcept : stream_(nullptr) {}
        explicit iterator(std::istream &is) : stream_(&is)
        {
            ++*this;
        }

        reference operator*() const noexcept
        {
            return line_;
        }

        pointer operator->() const noexcept
        {
            return &line_;
        }

        iterator &operator++()
        {
            getline(*stream_, line_);
            if (!stream_)
            {
                stream_ = nullptr;
            }
            return *this;
        }

        iterator operator++(int)
        {
            iterator tmp(*this);
            ++*this;
            return tmp;
        }

    private:
        std::istream *stream_;
        std::string line_;
	};
};
```
我们定义了默认构造函数，将`stream_`清空；相应的，在带参数的构造函数里，我们根据传入的输入流来设置`stream_`。我们也定义了`*`和`->`运算符来取得迭代器指向的文本行的引用和指针，并用`++`来读取输入流的内容。唯一“特别”点的地方，是我们在构造函数里调用了`++`，确保在构造后调用`*`运算符时可以读取内容，符合日常先使用`*`，再使用`++`的习惯。一旦文件读取到尾部，则`stream_`被清空，回到默认构造的情况。

对于迭代器之间的比较，则主要考虑文件有没有读到尾部的情况，简单定义为：
```cpp
bool operator==(const iterator &other) const noexcept
{
    return stream_ == other.stream_;
}

bool operator!=(const iterator &other) const noexcept
{
    return !operator==(other);
}
```

有了这个 iterator 的定义之后，istream_line_reader 的定义就简单了：
```cpp
class istream_line_reader
{
public:
    class iterator {...};

    istream_line_reader() noexcept : stream_(nullptr) {} 

    explicit istream_line_reader(std::istream &is) noexcept : stream_(&is) {}

    iterator begin()
    {
        return iterator(*stream_);
    }

    iterator end() const noexcept
    {
        return iterator();
    }

private:
    std::istream *stream_;
};
```
也就是说，构造函数只是简单地把输入流的指针赋值给`stream_`成员变量。`begin`成员函数负责构造一个真正有意义的迭代器；`end`成员函数则只是返回一个默认构造的迭代器。