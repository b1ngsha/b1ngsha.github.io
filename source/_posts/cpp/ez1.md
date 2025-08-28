---
title: 现代C++32讲：易用性改造 I - 自动类型推断和初始化
date: 2025-08-24 17:37:43
tags: C++
categories: C++
---
# 自动类型推断
## auto
`auto`并没有改变 C++是静态类型语言这一事实，使用 auto 的变量或函数返回值的类型仍然是编译时就确定了，只不过编译器能自动填充。
不使用自动类型推断时，如果容器类型未知的话，我们还需要加上`typename`，用于显式告诉编译器这是一个类型，而不是静态变量之类的（注意此处 const 引用还要求我们写 const_iterator 作为迭代器的类型）：
```cpp
template <typename T>
void foo(const T &container)
{
    for (typename T::const_iterator it = container.begin(), ...)
}
```

在不用自动类型推断的情况下，如果我们的遍历函数要求支持 C 数组的话，就只能使用两个不同的重载：
```cpp
template <typename T, std::size_t N>
void foo(const T (&a)[N])
{
    typedef const T *ptr_t;
    for (ptr_t it = a, end = a + N; it != end ; ++it) {
        // ...
    }
}

template <typename T>
void foo(const T &c)
{
    for (typename T::const_iterator it = c.begin(), end = c.end(); it != end; ++it) {
        // ...
    }
}
```
如果使用自动类型推断和 C++11 提供的全局`begin`和`end`函数的话，就可以统一成：
```cpp
template <typename T>
void foo(const T &c)
{
    // ADL
    using std::begin;
    using std::end;

    for (auto it = begin(c), ite = end(c); it != ite; ++it) {
        // ...
    }
}
```

**auto 实际使用的规则类似于函数模版参数的推导规则。**

## decltype
它的用途是获得一个表达式的类型，结果可以跟类型一样使用。它有两个基本用法：
- `decltype(var)` 可以获得变量的精确类型
- `decltype(expr)` （表达式不是变量名，但包括`decltype((var))`的情况） 可以获得表达式的引用类型；除非表达式的结果是个纯右值，此时表达式的结果仍然是值类型

## decltype(auto)
在用 auto 的时候有个限制，你需要在写下 auto 的时候就决定你写下的是个引用类型还是指类型。根据类型推导规则，auto 是值类型，auto& 是左值引用类型，auto&& 是转发引用。使用 auto 不能通用地根据表达式类型来决定返回值的类型，不过，`decltype(auto)`既可以是值类型，也可以是引用类型。因此，我们可以这么写：
```cpp
decltype(expr) a = expr;
```
但这种写法明显会造成大量重复代码，为此，C++14 引入了`decltype(auto`语法，对于这种情况，这样写就行了：
```cpp
decltype(auto) a = expr;
```
这种代码主要用在通用的转发函数模版中，你可能根本不知道调用的函数是不是会返回一个引用。这时使用这种语法就会方便很多。

# 函数返回值类型推断
从 C++14 开始，函数的返回值也可以用 auto 或 decltype(auto) 来声明了。

和这个形式相关的有另一个语法——后置返回值类型声明：
```cpp
auto foo(params) -> return_type 
{
    // ...
}
```
通常，在返回类型比较复杂、特别是返回类型跟参数类型有某种推导关系时会使用这种语法。

# 类模版的模版参数推导
如果你用过 pair 的话，一般都不会使用这种形式：
```cpp
pair<int, int> pr{1, 42};
```
使用 `make_pair` 显然更容易些：
```cpp
auto pr = make_pair(1, 42);
```

这是因为函数模板有模板参数推导，使得调用者不必手工指定参数类型；但C++17 之前的类模板却没有这个功能，也因而催生了像`make_pair`这样的工具函数。

而在进入了 C++17 后，这类函数就变得不必要了。我们现在可以直接写：
```cpp
pair pr{1, 42};
```
同样的，array 的初始化也可以像这样：
```cpp
array a{1, 2, 3};
```

这种自动推导机制，可以是编译器根据构造函数来自动生成：
```cpp
template <typename T>
struct MyObj 
{
    MyObj(T value);
    ...
};

MyObj obj1{string("hello")}; // MyObj<string>
MyObj obj2{"hello"}; // MyObj<const char*>
```

也可以是手工提供一个推导向导：
```cpp
template <typename T>
struct MyObj
{
    MyObj(T value);
    ...
};

MyObj(const char*) -> MyObj<string>;

MyObj obj{"hello"}; // MyObj<string>
```

# 结构化绑定
在之前我们写过这样的实现：
```cpp
multimap<string, int>::iterator lower, upper;
std::tie(lower, upper) = mmp.equal_range("four");
```
在这里，返回值是个pair，我们就不得不声明两个变量，然后用 tie 来接收结果。
但是在 C++17 中引入了新语法，解决了这个问题，现在我们可以把上面的代码简化为：
```cpp
auto [lower, upper] = mmp.equal_range("four");
```

# 列表初始化
在 C++98 里，标准容器比起 C 风格的数组还有一个明显劣势：不能在代码里方便地初始化容器内容。比如，数组你可以这样写：
```cpp
int a[] = {1, 2, 3, 4, 5};
```
而对于 vector 你却得：
```cpp
vector<int> v;
v.push(1);
v.push(2);
v.push(3);
...
```
于是，C++引入了列表初始化，允许以更简单的方式来初始化对象：
```cpp
vector<int> v{1, 2, 3, 4, 5};
```
重要的是，这不是对标准库容器的特殊处理，而是一个通用的、可以用于各种类的方法。编译器只是对`{1, 2, 3}` 这样的表达式自动生成一个类型为`initializer_list`的初始化列表，程序员只需要声明一个接受`initializer_list`的构造函数即可使用。

# 统一初始化
C++11 引入了用大括号来进行对象初始化的新语法，能够代替很多小括号在变量初始化时使用。这被称为统一初始化。

你几乎可以在所有初始化对象的地方使用大括号而不是小括号。它还有一个附带的特点，当一个构造函数没有标成 `explicit`时，你可以使用大括号而不写类名来进行构造：
```cpp
Obj getObj()
{
    return {1.0};
}
```
除了形式上的区别，它与`Obj(1.0)`的主要区别是，后者可以用来调用`Obj(int)`，而是用大括号时编译器会**拒绝窄转换**。

这个语法主要的限制是，如果一个类既有使用初始化列表的构造函数，又有不使用初始化列表的构造函数，那编译器会千方百计地试图调用使用初始化列表的构造函数，导致各种意外。一个比较好的实践方式：
- 如果一个类没有使用初始化列表的构造函数时，初始化该类对象可全部使用统一初始化语法
- 如果一个类有使用初始化列表的构造函数时，则只应用在初始化列表构造的情况

# 类数据成员的默认初始化
数据成员本身可以在构造函数里进行初始化，但在成员比较多的时候，很容易漏掉对某个成员进行初始化。为此，C++11 增加了一个语法，**允许在声明数据成员时直接给予一个初始化表达式**。这样，当且仅当构造函数的初始化列表中不包含该数据成员时，这个数据成员就会自动使用初始化表达式进行初始化。
例如：
```cpp
class Complex 
{
public:
    Complex() {}
    Complex(float re) : re_(re) {}
    Complex(float re, float im) : re_(re), im_(im) {}	

private:
    float re_{0};
    float im_{0};
}
```