---
title: The Rust Programming Language：Generic Types, Traits, and Lifetimes
date: 2025-09-19 23:53:43
tags: Rust
categories: Rust
---

# Removing Duplication by Extracting a Function
在深入学习泛型之前，让我们先看看如何以提取一个不包含泛型的函数的方式移除重复代码，然后我们将应用相同的技术来提取一个泛型函数。
以下面这段简短的代码为例：
```rust
fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let mut largest = &number_list[0];

    for number in &number_list {
        if number > largest {
            largest = number;
        }
    }

    println!("The largest number is {largest}");
}
```

讲这里的逻辑抽象为一个 `largest` 函数：
```rust
fn largest(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    
    largest
}
```
这里只能处理 `i32` 类型的 list，让我们通过使用泛型来让它可以处理各种类型。

# Generic Data Types
## In Function Definitions
将上面的 `largest` 函数抽象为泛型函数：
```rust
fn largest<T>(list: &[T]) -> &T {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];

    let result = largest(&number_list);
    println!("The largest number is {result}");

    let char_list = vec!['y', 'm', 'a', 'q'];

    let result = largest(&char_list);
    println!("The largest char is {result}");
}
```
但现在无法成功编译：
```bash
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0369]: binary operation `>` cannot be applied to type `&T`
 --> src/main.rs:5:17
  |
5 |         if item > largest {
  |            ---- ^ ------- &T
  |            |
  |            &T
  |
help: consider restricting type parameter `T` with trait `PartialOrd`
  |
1 | fn largest<T: std::cmp::PartialOrd>(list: &[T]) -> &T {
  |             ++++++++++++++++++++++

For more information about this error, try `rustc --explain E0369`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```
报错信息中提示我们对类型 T 进行 `std::cmp::PartialOrd` 这个 trait 的限制。 因为我们在函数体中对 T 进行了比较操作，但是不是所有类型都可以被比较，因此只能限制类型 T 为可被比较的类型，而这些类型都是实现了 `std::cmp::PartialOrd` 这个 trait 的。

## In Struct Definitions
在结构体定义上使用泛型：
```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let integer = Point { x: 5, y: 10 };
    let float = Point { x: 1.0, y: 4.0 };
}
```

这里 `x` 和 `y` 必须是相同的类型，如果赋值了不同类型：
```rust
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let wont_work = Point { x: 5, y: 4.0 };
}
```
此时会编译报错：
```bash
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0308]: mismatched types
 --> src/main.rs:7:38
  |
7 |     let wont_work = Point { x: 5, y: 4.0 };
  |                                      ^^^ expected integer, found floating-point number

For more information about this error, try `rustc --explain E0308`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

如果想要分别使用不同的类型，就需要定义两个泛型参数：
```rust
struct Point<T, U> {
    x: T,
    y: U,
}

fn main() {
    let both_integer = Point { x: 5, y: 10 };
    let both_float = Point { x: 1.0, y: 4.0 };
    let integer_and_float = Point { x: 5, y: 4.0 };
}
```

## In Enum Definitions
在枚举定义中使用泛型：
```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

## In Method Definitions
```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    } 
}

fn main() {
    let p = Point { x: 5, y: 10 };
    
    println!("p.x = {}", p.x());
}
```
在 `impl` 后声明 `T` 作为泛型类型，Rust 就可以辨别出在 `Point` 后方括号中的 `T` 是一个泛型类型而不是一个真实的类型。

我们可以仅在某种具体类型的实例上实现方法，而不是在泛型类型的实例上：
```rust
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

结构体定义中的泛型类型参数并不总是与结构体的方法签名中的参数相同：
```rust
struct Point<X1, Y1> {
    x: X1,
    y: Y1,
}

impl<X1, Y1> Point<X1, Y1> {
    fn mixup<X2, Y2>(self, other: Point<X2, Y2>) -> Point<X1, Y2> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y);
}
```

## Performance of Code Using Generics
在 Rust 中，使用泛型的程序不会比使用实际类型的更慢，这不会有额外的运行时开销。
Rust 通过在编译时对泛型代码执行单态化（monomorphization）。单态化是通过在编译时填充使用的具体类型，将泛型代码转换为特定代码的过程。在这个过程中，编译器查找所有调用泛型代码的地方，并生成用于调用泛型代码的具体类型的代码。

通过 `Option<T>` 来看看这是怎么工作的：
```rust
let integer = Some(5);
let float = Some(5.0);
```
当 Rust 编译这段代码时，它会执行单态化。在这个过程中，编译器读取了在 `Option<T>` 实例中使用的值，并识别出两种类型的 `Option<T>`：一种是 `i32`，另一种是 `f64`。因此，它将 `Option<T>` 的泛型定义扩展为专门针对 `i32` 和 `f64` 的两个定义，从而用特定的定义替代了泛型定义。

单态化后的代码看起来就会像是这样（实际上的名称会不同）：
```rust
enum Option_i32 {
    Some(i32),
    None,
}

enum Option_f64 {
    Some(f64),
    None,
}

fn main() {
    let integer = Option_i32::Some(5);
    let float = Option_f64::Some(5.0);
}
```
通用的 `Option<T>` 被编译器创建的特定定义所替代。因为 Rust 将通用代码编译为每个实例指定类型的代码，所以使用泛型不会产生运行时成本。当代码运行时，它的表现和我们手动复制每个定义一样。单态化的过程使得 Rust 的泛型在运行时极其高效。

# Traits: Defining Shared Behavior
Trait 其实类似其他语言中的接口，但有些不同之处。

## Defining a Trait
一个类型的行为由我们可以在该类型上调用的方法组成。如果我们能够在所有这些类型上调用相同的方法，则不同的类型共享相同的行为。特征定义是一种将方法签名分组在一起，以定义完成某些目的所需的一组行为的方法。

例如定义一个 trait：
```rust
pub trait Summary {
    fn summarize(&self) -> String;
}
```
大括号中定义了方法签名，它们描述了实现了这个 trait 的类型的行为。

## Implementing a Trait on a Type
在 `NewsArticle` 和 `SocialPost` 这两个结构体上实现 `Summary` trait：
```rust
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

pub struct SocialPost {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub repost: bool,
}

impl Summary for SocialPost {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

此时就可以在 `NewsArticle` 和 `SocialPost` 的实例上跟像调用普通方法一样调用 trait 方法，注意要讲 scope 和 types 都引入当前作用域：
```rust
use aggregator::{SocialPost, Summary};

fn main() {
    let post = SocialPost {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        repost: false,
    };

    println!("1 new post: {}", post.summarize());
}
```
有一个限制，就是我们在类型上实现 trait 时，必须满足类型 或 trait 或二者都是在我们 crate 本地的。

## Default Implementations
我们修改一下，给 `Summary` trait 的 `summarize` 方法添加默认的字符串返回值：
```rust
pub trait Summary {
    fn summarize(&self) -> String {
        String::from("(Read more...)")
    }
}
```
为了让 `NewsArticle` 使用 `Summary` trait 的默认实现，可以用一个空的 `impl` block：
```rust
impl Summary for NewsArticle {}
```
这表示 `NewsArticle` 实现了 `Summary` trait，但没有自定义实现。

有默认实现的 trait method 可以调用相同 trait 中的其他方法，即使被调用的方法没有提供默认实现：
```rust
pub trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```
此时我们只需要实现 `Summary` 中的 `summarize_author` 方法。

## Traits as Parameters
```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}
```
这个参数接受所有实现了这个特定的 trait 的类型。

### Trait Bound Syntax
上面这种写法实际上是一个语法糖，原本的形式叫做 trait bound，看起来会像这样：
```rust
pub fn notify<T: Summary>(item: &T) {
    //...
}
```

当我们想强制多个参数的类型相同时，我们必须使用 trait bound：
```rust
pub fn notify<T: summary>(item1: &T, item2: &T) {
```

### Specifying Multiple Trait Bounds with the `+` Syntax
我们还能指定超过一个 trait bound：`
```rust
pub fn notify(item: &(impl Summary + Display)) {
```
或是这种形式：
```rust
pub fn notify<T: Summary + Display>(item: &T) {
```
这要求传入的类型同时实现 `Summary` 和 `Display` 这两种 trait。

### Clearer Trait Bounds with `where` Clauses
Instead of writing this:
```rust
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> i32 {
```
we can use a `where clause`, like this:
```rust
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
```

## Returning Types That Implement Traits
```rust
fn returns_summarizable() -> impl Summary {
    SocialPost {
        username: String::from("horse_ebooks"),
        content: String::from(
            "of course, as you probably already know, people",
        ),
        reply: false,
        repost: false,
    }
}
```
但你只能在返回单一类型时使用 `impl Trait`：
```rust
fn returns_summarizable(switch: bool) -> impl Summary {
    if switch {
        NewsArticle {
            headline: String::from(
                "Penguins win the Stanley Cup Championship!",
            ),
            location: String::from("Pittsburgh, PA, USA"),
            author: String::from("Iceburgh"),
            content: String::from(
                "The Pittsburgh Penguins once again are the best \
                 hockey team in the NHL.",
            ),
        }
    } else {
        SocialPost {
            username: String::from("horse_ebooks"),
            content: String::from(
                "of course, as you probably already know, people",
            ),
            reply: false,
            repost: false,
        }
    }
}
```

## Using Trait Bounds to Conditionally Implement Methods
```rust
use std::fmt::Display;

struct Pair<T> {
    x: T,
    y: T,
}

impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```
对于第二个方法，只有当 `Pair<T>` 中的 `T` 类型同时实现 `Display` 和 `PartialOrd` 这两个 trait 时才会被实现。

满足 trait bounds 的任何类型上的 trait 实现被称为全局实现。例如，标准库在实现了 Display trait 的任何类型上都实现了 ToString trait：
```rust
impl<T: Display> ToString for T {
    // --snip--
}
```

# Validating References with Lifetimes
生命周期是另一种泛型。
Rust 要求我们用泛型生命周期参数注明引用关系，以确保在运行时使用的引用是一定有效的。

## Preventing Dangling References with Lifetimes
生命周期的主要目的是防止悬挂引用，这会导致程序引用与其意图引用的数据不相符。
思考下面这段代码：
```rust
fn main() {
    let r;

    {
        let x = 5;
        r = &x;
    }

    println!("r: {r}");
}
```
> 在 `r` 被定义后，我们没有初始化它，这可能会让我们认为这个行为违反了 “Rust 没有空值” 的设计。但如果我们此时尝试使用这个变量，其实会抛出一个编译期异常，这表示 Rust 确实是不允许空值的。

这段代码无法编译，因为 `r` 引用的值在我们尝试使用之前已经超出作用域了：
```bash
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0597]: `x` does not live long enough
 --> src/main.rs:6:13
  |
5 |         let x = 5;
  |             - binding `x` declared here
6 |         r = &x;
  |             ^^ borrowed value does not live long enough
7 |     }
  |     - `x` dropped here while still borrowed
8 |
9 |     println!("r: {r}");
  |                  --- borrow later used here

For more information about this error, try `rustc --explain E0597`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```

所以 Rust 是如何判断这段代码是无效的呢？它使用了一个叫 borrow checker 的东西。

## The Borrow Checker
它会比较作用域，用来判断是否所有借用都是有效的。下面这段代码我们做了一些注释：
```rust
fn main() {
    let r;                // ---------+-- 'a
                          //          |
    {                     //          |
        let x = 5;        // -+-- 'b  |
        r = &x;           //  |       |
    }                     // -+       |
                          //          |
    println!("r: {r}");   //          |
}                         // ---------+
```
这里我们用 `'a` 和 `'b` 标识了 `r` 和 `x` 的生命周期。在编译器，Rust 比较了两个生命周期的大小，并会发现 `r` 有 `'a` 这个生命周期但它引用了有 `'b` 生命周期的内存。这个程序会被拒绝因为 `'b` 比 `'a` 短：引用的主体的生命周期不如引用本身长。

下面的代码没有悬挂引用并且它没有任何编译期异常：
```rust
fn main() {
    let x = 5;            // ----------+-- 'b
                          //           |
    let r = &x;           // --+-- 'a  |
                          //   |       |
    println!("r: {r}");   //   |       |
                          // --+       |
}                         // ----------+
```
这里 `x` 有生命周期 `'b`，在这个 case 中它比 `'a` 大。这意味着 `r` 可以引用 `x` 因为 Rust 知道当 `x` 有效时，`r` 中的引用也总会是有效的。

## Generic Lifetimes in Functions
编写一个函数，返回两个字符串中间较长的那个。
如果你尝试像这样实现 `largest` 函数，它是不能编译通过的：
```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```
错误信息：
```bash
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0106]: missing lifetime specifier
 --> src/main.rs:9:33
  |
9 | fn longest(x: &str, y: &str) -> &str {
  |               ----     ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `x` or `y`
help: consider introducing a named lifetime parameter
  |
9 | fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
  |           ++++     ++          ++          ++

For more information about this error, try `rustc --explain E0106`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```
错误信息反映，返回类型需要一个泛型生命周期参数，因为 Rust 无法确定这个返回值引用是 `x` 还是 `y`。但实际上，我们也不知道。
borrow checker 同样也无法确定，因为它也不知道谁的生命周期会关联到返回值的生命周期上。
为了修复这个错误，我们将添加定义引用间关系的泛型生命周期参数，以让 borrow checker 可以执行它的分析。

## Lifetime Annotation Syntax
生命周期注解不会改变引用的生命周期长度，它们描述了复杂的引用之间的生命周期的关系，但不影响生命周期本身。

一些示例：
```rust
&i32        // a reference
&'a i32     // a reference with an explicit lifetime
&'a mut i32 // a mutable reference with an explicit lifetime
```
单独的生命周期注解没有什么意义，因为这些注解是为了告诉 Rust 这些不同的引用之间的泛型生命周期参数是如何互相联系的。让我们看看在 `longest` 这个函数上下文中，生命周期注解是如何互相联系的。

## Lifetime Annotations in Function Signatures
为了能在函数签名中使用生命周期注解，我们需要在函数方括号中声明泛型生命周期参数。我们想要让函数签名表达以下约束：只要参数都是有效的，那么被返回的引用也将是有效的。这就是参数和返回值的生命周期之间的联系。我们将会把生命周期命名为 `'a` 并将其添加到每个引用中：
```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```
这个方法签名告诉 Rust，无论是两个参数，还是返回值，都至少会存活和生命周期 `'a` 一样长。实际上，这意味着 `longest` 函数返回的引用的生命周期是和参数指向的值中较短的生命周期相同的。

当我们把具体的引用传递到 `longest` 时，具体的将 `'a` 替换掉的生命周期是 `x` 与 `y` 的生命周期的重叠部分，换句话说，也就是它们之间较短的那一个。

## Thinking in Terms of Lifetimes
指定生命周期参数的方式取决于你的函数行为。例如，如果我们将 `longest` 函数的实现修改为总是返回第一个参数而不是最长的字符串切片，那么我们就不需要指定 `y` 的生命周期了：
```rust
fn longest<'a>(x: &'a str, y: &str) -> &'a str {
    x
}
```
因为此时 `y` 的生命周期与 `x` 和返回值的生命周期都无关了。

当从函数中返回一个引用时，这个返回类型的生命周期参数需要匹配到任意一个参数的生命周期。如果这个被返回的引用没有指向任意一个参数，那它必须引用一个在这个函数中被创建的值。然而，这会是一个悬挂引用，因为这个值在函数结束时将会超出作用域：
```rust
fn longest<'a>(x: &str, y: &str) -> &'a str {
    let result = String::from("really long string");
    result.as_str()
}
```
这里即使我们已经给返回类型指定了一个生命周期参数 `'a`，但这个实现将会编译失败，因为这个返回值的生命周期没有关联到任何一个参数的生命周期：
```bash
$ cargo run
   Compiling chapter10 v0.1.0 (file:///projects/chapter10)
error[E0515]: cannot return value referencing local variable `result`
  --> src/main.rs:11:5
   |
11 |     result.as_str()
   |     ------^^^^^^^^^
   |     |
   |     returns a value referencing data owned by the current function
   |     `result` is borrowed here

For more information about this error, try `rustc --explain E0515`.
error: could not compile `chapter10` (bin "chapter10") due to 1 previous error
```
此时最好的方法是返回一个 owned data type，而不是返回一个引用，把清理值的职责交给调用者。

## Lifetime Annotations in Struct Definitions
至今，我们定义的结构体都只包含 owned types。我们可以定义持有引用的结构体，但在这种情况下，我们将需要在这个结构体定义中的每个引用上都添加生命周期注解：
```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split(".").next().unwrap();
    let i = ImportantExcerpt {
        part: first_sentence,
    };
}
```
该注解意味着 `ImportantExcerpt` 的实例不能超过其在 `part` 字段中持有的引用的生命周期。

## Lifetime Elision
以下函数在没有生命周期注解的情况下也能编译：
```rust
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}
```
这里是因为历史原因：在早一些的版本（1.0 之前）中，这段代码不能运行，因为每个引用都需要一个显式的生命周期。在那个时候，这个函数的签名会被写成这样：
```rust
fn first_word<'a>(s: &'a str) -> &'a str {
```
在写了大量的 Rust 代码后，Rust 团队发现 Rust 开发者在特定情况下会不断地输入相同的生命周期注解，并且这些情况是可预测、遵循一些确定模式的。因此开发者团队将这些模式编码到了编译器当中，使得 borrow checker 可以推断这些情况下的生命周期，并且不需要显式的注解。

函数和方法参数上的生命周期叫 input lifetimes（输入生命周期），返回值上的生命周期叫 output lifetimes （输出生命周期）。

当没有明确的注解时，编译器使用三条规则来确定引用的生命周期。第一条规则适用于输入生命周期，第二和第三条规则适用于输出生命周期。如果编译器执行完这三条规则仍然无法确定某些引用的生命周期，编译器将停止并报错。这些规则适用于函数定义以及方法实现。
第一条规则是，编译器给每个是引用的方法参数分配一个生命周期参数；也就是说，只有一个参数的函数会得到一个生命周期参数：`fn foo<'a>(x: &'a i32)`；有两个参数的函数则会分别得到一个生命周期参数：`fn foo<'a, 'b>(x: &'a i32, y: &'b i32)`，以此类推。
第二条规则是，如果确实只有一个输入生命周期参数，那么这个生命周期会被分配给所有输出生命周期参数：`fn foo<'a>(x: &'a i32) -> &'a i32`。
第三条规则是，如果有多个输入生命周期参数，但是其中一个是 `&self` 或 `&mut self`，那么 `self` 的生命周期会被分配给所有的输出生命周期参数。

让我们假装自己是编译器，我们将对上面的 `first_word` 函数应用这三条规则以确定生命周期。刚开始函数签名没有任何生命周期信息：
```rust
fn first_word(s: &str) -> &str {
```
应用第一条规则：
```rust
fn first_word<'a>(s: &'a str) -> &str {
```
应用第二条：
```rust
fn first_word<'a>(s: &'a str) -> &'a str {
```
现在方法签名中的所有引用都用了生命周期，编译器就可以继续分析了，不需要开发者在函数签名上进行注解。

## Lifetime Annotations in Method Definitions
当我们在结构体上实现带有生命周期的方法时，我们使用与泛型类型参数相同的语法。我们声明和使用生命周期参数的位置取决于它们与结构体字段和返回值之间的关系。
在 `impl` 块的方法签名中，引用可能与结构体字段中的引用的生命周期有关，也可能是独立的。此外，生命周期忽略规则通常使得在方法签名中不需要生命周期注释。

来看一些例子：
```rust
impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }
}
```
因为第一条规则，因此我们不需要做生命周期注释。

```rust
impl<'a> ImportantExcerpt<'a> {
    fn announce_and_return_part(&self, announcement: &self) -> &str {
        println!("Attention please: {announcement}");
        self.part
    }
}
```
首先应用第一条规则，会给 `&self` 和 `announcement` 分别分配一个它们自己的生命周期。然后，因为第一个参数是 `&self`，因此返回类型会得到 `&self` 的生命周期。

## The Static Lifetime
一个特殊的生命周期是 `'static`，表示引用会在整个程序运行期间有效。所有字符串字面量都有 `'static` 生命周期，我们也可以像这样注解：
```rust
let s: &'static str = "I have a static lifetime.";
```


