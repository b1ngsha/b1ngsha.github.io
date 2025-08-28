---
title: The Rust Programming Language：Understanding Ownership
date: 2025-08-29 00:12:56
tags:
---
所有权（Ownership）是Rust最独特的特性，它使Rust能够**在不需要垃圾收集器的情况下保证内存安全**，因此理解所有权是很重要的。在本章中，我们将会讨论所有权以及相关的几个特性：借用（borrowing），切片（slices），以及Rust如何在内存中分布数据。

# What Is Ownership?
所有权是一组规则，规范Rust程序如何管理内存。所有程序在运行时都需要管理它们使用计算机内存的方式。一些语言具有垃圾收集器，能够在程序运行时定期寻找不再使用的内存；在其他一些语言中，程序员需要显式地分配和释放内存。**Rust采用了第三种方式：内存通过一套所有权规则进行管理，编译器会检查这些规则。如果违反了任何规则，程序都将无法编译。所有权的任何特性都不会减慢程序运行的速度。**
在本章节中，我们将会通过一些示例来学习所有权，这些示例专注于一种非常常见的数据结构：字符串。

> The Stack and the Heap
> 一般的编程语言不会要求你经常考虑堆栈问题，但在像Rust这种“System programming language”当中，一个值是分配在堆还是栈中会影响语言的行为。因此，在介绍所有权之前，先对堆栈这一前置知识做一个简要的说明。
> 堆和栈都是内存的不同部分，它们在代码运行时可用，但会被以不同的结构组织。栈会按照接收值的顺序存储它们，并以相反的顺序移除值。这被称为后进先出（last in, first out）。在栈中添加数据被称为推入栈（pushing into the stack），而移除数据被称为弹出栈（popping off the stack）。**栈上存储的所有数据都必须有已知的固定大小**。编译时大小未知或者是大小可能发生变化的数据必须被存储在堆上。
> 堆的组织性相对来说较弱。当你把数据放到堆中时，你会请求一定大小的空间。内存分配器会在堆中寻找一个足够大小的空位，把它标记为使用中的状态，并返回一个指针，指向该位置的地址。整个过程被称为在堆上分配（allocating on the heap），有时也被简单地称为分配（allocating）。将值推入栈中不被视作分配。**由于指向堆堆指针大小是已知、且固定的，所以你可以将这个指针存在栈上。** 但是如果你想要实际的数据时，你必须跟随指针。
> 推入栈这个动作是要比在堆上分配更快的，因为不需要寻找一个用来存放新数据的位置，这个位置总是在栈的最顶端。
> 访问堆中的数据是要比访问栈中的数据更慢的，因为你必须通过指针进行访问。当代处理器如果在内存当中做的跳转更少，就会变得更快。
> **当在代码中调用一个函数时，传递给函数的值（可能包括指向堆的指针）和函数的局部变量都会被推入栈中。** 当函数结束时，这些值都会从栈中弹出。
> 跟踪代码的哪些部分正在使用堆上的数据，最小化堆上重复数据的数量，以及清理未使用的堆数据以免用完空间，这些都是所有权要解决的问题。一旦你理解了使所有权，你就不需要经常考虑堆和栈，但是知道**所有权的主要目的是管理堆数据**可以帮助解释为什么它要以这种方式来工作。

## Ownership Rules
首先，让我们来看看所有权规则：
* **Rust中的每个值都有一个所有者。**
* **一次只能有一个所有者。**
* **当所有者超出作用域时，值将会被抛弃。**

## Variable Scope
作为所有权的第一个示例，我们将会观察变量的作用域。作用域是程序中某个项的有效范围。对于以下变量：
```rust
let s = "hello";
```
变量`s`指向一个字符串字面量，这个字符串是在程序当中硬编码的。这个变量在它被声明的地方直到当前作用域的结尾都是有效的：
```rust
{ // s is not valid here, it's not yet declared
    let s = "hello"; // s is valid from this point forward

    // do stuff with s
} // this scope is now over, and s is no longer valid
```

## The `String` Type
我们想要观察在堆中存储的数据，并探索Rust是如何知道何时清理它的。`String`类型是一个很好的示例。
我们将关注`String`当中与所有权相关的部分。这些方面也适用于其他复杂的数据类型，无论是由标准库提供还是由你创建。我们将在后续的章节中更深入地讨论`String`类型。
`String`类型管理堆上分配的数据，因此能够存储在编译时对我们来说大小未知的文本。你可以使用`from`函数来从字符串字面量创建一个`String`：
```rust
let s = String::from("hello");
```
这种字符串与字符串字面量不同的是，它是可变的：
```rust
let mut s = String::from("hello");
s.push_str(", world!");
println!("{s}");
```
所以，为什么`String`可以被修改，但是字面量不能？它们的差异在处理内存的方式上。

## Memory and Allocation
对于字符串字面量而言，我们在编译期就能知道它的内容，所以这个值是直接硬编码到最终的可执行文件中的。这就是为什么字符串字面量是快速且高效的。但是这些优点只来源于字符串字面量的不可变性。不幸的是，我们不能为了每个在编译期大小未知，且在运行时大小可能改变的文本，而将一块内存放入二进制文件中。
对于`String`类型，为了支持一个可变的，可增长的文本片段，我们需要在堆上分配一块在编译期未知大小的内存来存储内容。这意味着：
- 这块内存必须在运行时被内存分配器请求。
- 当我们完成了对`String`的使用时，我们需要有一种方式将这块内存返回给分配器。
第一部分是由我们来完成的：当我们调用`String::from`时，它的实现请求了所需的内存。
然而，第二部分是不同的。在有GC的语言当中，GC会跟踪并清除不再被使用的内存，我们就不需要再考虑它了。在大多数没有GC的语言当中，就需要由我们来识别内存何时不再使用，并调用代码来显式释放它，就和我们请求它时所做的一样。正确地做到这一点一直是一件困难的事情。如果我们忘记了，我们就会浪费内存。如果我们做得太早，我们就会有一个无效的变量。如果我们做了两次，也会出现bug。我们需要精确地将一个`allocate`与一个`free`进行配对。
Rust选择了一个不同的道路：**一旦拥有内存的变量超出作用域，那么这块内存会被自动释放。当一个变量超出作用域时，Rust会为我们调用一个特殊的函数`drop`，这也是`String`的作者可以放置释放内存代码的地方。Rust会在闭合的大括号处自动调用`drop`。**
这个模式对Rust代码的编写方式产生了深远的影响。现在看起来可能很简单，但在更复杂的情况下——我们希望多个变量使用我们在堆上分配的内存时，代码的行为可能是意想不到的。让我们现在探索部分这些情况。

### Variables and Data Interacting with Move
在Rust中，多个变量可以以不同的方式与相同的数据交互。让我们看一个整数的示例：
```rust
let x = 5;
let y = x;
```
现在我们有了两个变量，`x`和`y`，它们的值都是`5`。因为整数是已知的，具有固定大小的简单值，因此这两个`5`都会被压入栈中。
现在让我们来看看`String`的情况：
```rust
let s1 = String::from("hello");
let s2 = s1;
```
这看起来很相似，所以我们猜测它的工作方式可能是相同的：也就是说，第二行将`s1`的值复制一份并绑定到`s2`上。但其实不然。
下图可以让我们了解字符串内部存在什么。一个字符串由三个部分组成，如左侧所示：指向存储字符串内容的内存的指针、长度和容量。**这组数据存储在栈上**。右侧是存储内容的堆上的内存。
![一个值为"hello"的字符串在内存中的表示形式](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20250525223318.png)
长度是当前字符串内容使用的内存量，单位为字节。容量是字符串从分配器接收到的总内存量，单位也为字节。长度和容量之间的差异很重要，但在当前的上下文中不是很重要，因此目前可以忽略容量。
当我们将`s1`赋值给`s2`时，`String`数据被复制，这意味着复制了在栈上的指针，长度和容量。我们不会复制指针指向的堆内存。就像下图这样：
![变量s1和s2在内存中的表示](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20250525223936.png)
刚刚我们提到：当变量超出作用域时，Rust会自动调用`drop`函数来释放这个变量的对内存。但上图显示了两个指针指向同一个位置。那么就有一个问题：**当`s2`和`s1`超出作用域时，它们都会尝试释放相同的内存**。这被称为双重释放错误（double free error），是我们之前提到的内存安全错误之一。两次释放内存可能导致内存损坏，这可能会导致安全漏洞。
为了保证内存安全，在`let s2 = s1`之后，Rust会将`s1`视为不再有效。因此，当`s1`超出作用域时，Rust不需要释放任何东西。看看在创建`s2`之后尝试使用`s1`会发生什么；这将不起作用：
```rust
let s1 = String::from("hello");
let s2 = s1;

println!("{s1}, world!");
```
运行产生报错如下：
```shell
$ cargo run              
   Compiling variables v0.1.0 (/path/to/your/ownership)
warning: unused variable: `s2`
  --> src/main.rs:88:9
   |
88 |     let s2 = s1;
   |         ^^ help: if this is intentional, prefix it with an underscore: `_s2`
   |
   = note: `#[warn(unused_variables)]` on by default

error[E0382]: borrow of moved value: `s1`
  --> src/main.rs:89:28
   |
87 |     let s1 = String::from("hello");
   |         -- move occurs because `s1` has type `String`, which does not implement the `Copy` trait
88 |     let s2 = s1;
   |              -- value moved here
89 |     println!("{}, world!", s1);
   |                            ^^ value borrowed here after move
   |
   = note: this error originates in the macro `$crate::format_args_nl` which comes from the expansion of the macro `println` (in Nightly builds, run with -Z macro-backtrace for more info)
help: consider cloning the value if the performance cost is acceptable
   |
88 |     let s2 = s1.clone();
   |                ++++++++

For more information about this error, try `rustc --explain E0382`.
warning: `variables` (bin "variables") generated 1 warning
error: could not compile `variables` (bin "variables") due to 1 previous error; 1 warning emitted
```
如果你了解浅拷贝（shallow copy）和深拷贝（deep copy），这里的复制看起来会像是浅拷贝。但由于Rust还会使第一个变量无效，因此它被称为移动（move），而不是浅拷贝。在这个例子中，我们会说`s1`被移动到了`s2`当中。
此外，这暗示了一个设计选择：**Rust永远不会自动创建数据的“深度”副本**。因此，任何自动复制都可以认为在运行时性能方面是低成本的。

### Scope and Assignment
这与作用域、所有权和通过`drop`函数释放内存之间的关系正好相反。当你为现有变量分配一个全新的值时，Rust会调用`drop`并立即释放原始值的内存。例如：
```rust
let mut s = String::from("hello");
s = String::from("ahoy");

println!("{s}, world!");
```
我们首先声明了一个变量`s`，并将其绑定到一个值为`"hello"`的字符串上。然后，我们立即创建一个新的字符串，值为`"ahoy"`，并将其赋值给`s`。现在将不会有任何东西指向堆中的原始值。
![s的值被完全替换后的内存表示](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20250525230105.png)
因此，原始字符串超出了作用域，Rust会马上调用`drop`函数释放这块内存。

### Variables and Data Interacting with Clone
当我们想深拷贝`String`的堆内存，而不仅仅是栈中的数据时，我们可以使用`clone`方法。例如：
```rust
let s1 = String::from("hello");
let s2 = s1.clone();

println!("s1 = {s1}, s2 = {s2}");
```

### Stack-Only Data: Copy
还有一个问题我们没有谈到。那就是为什么以下的代码是有效的：
```rust
let x = 5;
let y = x;

println!("x = {x}, y = {y}");
```
但这与我们刚刚学到的好像冲突了，我们没有调用`clone`，但`x`仍然有效，且并没有移动到`y`。
原因是，像整数这种在编译期已知大小的类型是完全存在栈中的，所以对实际值的复制是很快速的。这意味着我们没有理由在创建变量`y`后阻止`x`有效。换句话说，这里的深拷贝和浅拷贝没有区别，所以调用`clone`不会做任何与浅拷贝不同的事。
Rust有一种特殊的注解，叫做复制特质（`Copy` trait），我们可以把它放在像整数一样存储在栈中的类型上。如果一个类型实现了`Copy` trait，那么它的变量就不会移动，而是被简单复制，从而在赋值给另一个变量后仍然有效。
如果一个类型或其任何部分已经实现了`Drop` trait，Rust不会让我们为该类型添加`Copy`注解。如果该类型需要在值类型超出作用域时做一些特殊处理，而我们又为其添加了`Copy`注解，那么就会出现编译期错误。

## Ownership and Functions
将一个值传递给一个函数的机制与给变量赋值是很相似的，也会产生移动或者是复制。例如：
```rust
fn main() {
    let s = String::from("hello"); // s comes into scope

    takes_ownership(s); // s's value moves into the function... and so is no longer valid here

    let x = 5; // x comes into scope

    makes_copy(x); // because i32 implements the Copy trait, x does not move into the function

    println!("{x}"); // it's okay to use x
} // x goes out of scope, then s. But because s's value was moved, nothing special here.

fn takes_ownership(some_string: String) { // some_string comes into scope
    println!("{some_string}");
}  // Here, some_string goes out of scope and `drop` is called. The backing memory is freed.

fn makes_copy(some_integer: i32) { // some_integer comes into scope
    println!("{some_integer}");
} // Here, some_integer goes out of scope and nothing happens.
```

## Return Values and Scope
返回值也会转换所有权。例如：
```rust 
fn main() {
    let s1 = gives_ownership(); // gives_ownership moves its return value into s1

    let s2 = String::from("hello"); // s2 comes into scope

    let s3 = takes_and_gives_back(s2); // s2 is moved into takes_and_gives_back, which also moves its return value into s3
} // Here, s3 goes out of scope and is dropped. s2 was moved, so nothing happens. s1 goes out of scope is dropped.

fn gives_ownership() -> String { // gives_ownership will move its return value into the function that calls it
    let some_string = String::from("yours"); // some_string comes into scope

    some_string // some_string is returned and moves out to the calling function
}

fn takes_and_gives_back(a_string: String) -> String { // this function takes a String and returns a String
    a_string // a_string comes into scope and is returned, moves out to the calling function
}
```
变量的所有权每次都遵循相同的模式：为另一个变量赋值会移动它。当包含堆中数据的变量退出作用域时，除非数据的所有权已经转移到另一个变量，否则该值将被`drop`清理。
虽然这种方法可行，但是在每个函数中获取所有权并返回所有权有点繁琐。如果我们想让一个函数使用一个值，但是不想让其剥夺所有权，我们该怎么做呢？我们传入的任何数据如果想再次使用，都需要传回。此外，我们可能还想返回函数主体产生的任何数据，这让人非常恼火。
Rust让我们能够通过元组返回多个值：
```rust
fn main() {
    let s1 = String::from("hello");

    let (s2, len) = calculate_length(s1);

    println!("The length of '{s2}' is {len}.");
}

fn calculate_length(s: String) -> (String, usize) {
    let length = s.len();

    (s, length)
}
```
但是，对于一个本应该很常见的概念来说，这太麻烦了。幸运的是，Rust有一种传递值却不转移所有权的功能，叫做引用（references）。

## References and Borrowing

在上面这个`calculate_length`的例子当中，我们可以用另一种方式，也就是提供一个指向这个`String`的引用。一个引用就像一个指针，它是一个我们可以跟踪访问存储在该地址的数据的地址；该地址由其他变量拥有。与指针不同的是，引用保证在引用的生命周期内指向特定类型的有效值。
这里有一个例子，这个函数将对象的引用作为参数，而不是直接获取这个值的所有权：
```rust
fn main() {
    let s1 = String::from("hello");

    let len = calculate_length(&s1);

    println!("The length of '{s1}' is {len}.");
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```
可以看到，我们把`&s1`传入了`calculate_length`，并且在其参数定义中，我们使用了`&String`而不是`String`。这些符号表示引用，它们允许你引用某个值而不抢占其所有权。下图表示了它们之间的关系：
![image.png](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20250607162731.png)

让我们来详细看看这里的函数调用：
```rust
let s1 = String::from("hello");

let len = calculate_length(&s1);
```
由于这个创建的引用`&s1`并没有抢占其所有权，因此它指向的值在它停止使用时也不会被销毁：
```rust
fn calculate_length(s: &String) -> usize { // s is a reference to a String
    s.len()
} // Here, s goes out of scope. But because s does not have ownership of what it refers to, the value is not dropped. 
```
也就是说，这里的`s`指向的值在`s`停止使用时并不会被释放，因为`s`并不拥有该值。
**我们称创建引用的行为为借用（*borrowing*）。**

那么，当我们尝试修改借用的值时，会发生什么呢？
```rust
fn main() {
    let s = String::from("hello");

    change(&s);
}

fn change(some_string: &String) {
    some_string.push_str(", world");
}
```
这里会产生报错：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/ownership)
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
  --> src/main.rs:8:5
   |
99 |     some_string.push_str(", world");
   |     ^^^^^^^^^^^ `some_string` is a `&` reference, so the data it refers to cannot be borrowed as mutable
   |
help: consider changing this to be a mutable reference
   |
98 | fn change(some_string: &mut String) {
   |                         +++

For more information about this error, try `rustc --explain E0596`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```
**引用也和变量一样，默认是不可变的。**

### Mutable References
我们只需要做一点点的小改动就可以获得一个可变的引用：
```rust
fn main() {
    let mut s = String::from("hello");

    change(&mut s);
}

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```
首先我们将变量`s`修改为`mut`，然后在`change`函数的参数中也加上`mut`，并且在调用时也加上`mut`。这清楚地表明了，`change`会改变借用的值。
可变的引用有一个很大的限制条件：**一个值有且只可有一个可变引用**。以下代码试图对`s`创建两个可变引用：
```rust
let mut s = String::from("hello");

let r1 = &mut s;
let r2 = &mut s;

println!("{}, {}", r1, r2);
```
这会产生报错：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/ownership)
error[E0499]: cannot borrow `s` as mutable more than once at a time
   --> src/main.rs:5:14
    |
105 |     let r1 = &mut s;
    |              ------ first mutable borrow occurs here
106 |     let r2 = &mut s;
    |              ^^^^^^ second mutable borrow occurs here
107 |
108 |     println!("{}, {}", r1, r2)
    |                        -- first borrow later used here

For more information about this error, try `rustc --explain E0499`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```
阻止在同一时间对同一数据进行多个可变引用的限制允许了进行变更，但方式非常受控。设定这个限制的好处是Rust可以在编译时防止数据竞争（*data race*），也就是并发写的问题。
我们可以创建一个新的作用域来允许多个可变变量：
```rust
let mut s = String::from("hello");

{
    let r1 = &mut s;
} // r1 goes out of scope here, so we can make a new reference with no problems.

let r2 = &mut s;
```
Rust对可变引用和不可变引用混合使用的情况也制定了类似的规则：
```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &s;
let r3 = &mut s;

println!("{}, {} and {}", r1, r2, r3);
```
这也会产生报错：
```shell
$ cargo run
Compiling variables v0.1.0 (/path/to/your/ownership)
error[E0502]: cannot borrow `s` as mutable because it is also borrowed as immutable
   --> src/main.rs:6:14
    |
114 |     let r1 = &s;
    |              -- immutable borrow occurs here
115 |     let r2 = &s;
116 |     let r3 = &mut s;
    |              ^^^^^^ mutable borrow occurs here
117 |
118 |     println!("{}, {} and {}", r1, r2, r3);
    |                               -- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```
我们同样不能在拥有一个不可变引用的情况下，对同一个变量创建一个可变引用。但是再继续创建不可变引用是可以的。

注意，引用的作用域从它被引入的地方开始，并持续到最后一次使用该引用为止。例如以下代码是可以编译成功的：
```rust
let mut s = String::from("hello");

let r1 = &s; // no problem
let r2 = &s; // no problem
println!("{r1} and {r2}");
// Variables r1 and r2 will not be used after this point.

let r3 = &mut s; // no problem
println!("{r3}");
```

### Dangling References
在包含指针的编程语言当中，很容易会创建出一个悬空指针——一个引用了可能已经被其他人使用的内存位置的指针——通过释放某些内存而保留对该内存的指针。而在Rust中，编译器保证引用永远不会是悬空引用：如果你有对某些数据的引用，编译器将确保数据不会在指向它的引用超出作用域之前超出作用域。
如果尝试创建一个悬空引用，那就会产生编译时报错：
```rust
fn main() {
    let reference_to_nothing = dangle();
}

fn dangle() -> &String {
    let s = String::from("hello");

    &s
}
```
报错如下：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/ownership)
error[E0106]: missing lifetime specifier
   --> src/main.rs:5:16
    |
125 | fn dangle() -> &String {
    |                ^ expected named lifetime parameter
    |
    = help: this function's return type contains a borrowed value, but there is no value for it to be borrowed from
help: consider using the `'static` lifetime, but this is uncommon unless you're returning a borrowed value from a `const` or a `static`
    |
125 | fn dangle() -> &'static String {
    |                 +++++++
help: instead, you are more likely to want to return an owned value
    |
125 - fn dangle() -> &String {
125 + fn dangle() -> String {
    |

warning: unused variable: `reference_to_nothing`
   --> src/main.rs:122:9
    |
122 |     let reference_to_nothing = dangle();
    |         ^^^^^^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_reference_to_nothing`
    |
    = note: `#[warn(unused_variables)]` on by default

error[E0515]: cannot return reference to local variable `s`
   --> src/main.rs:128:5
    |
128 |     &s
    |     ^^ returns a reference to data owned by the current function

Some errors have detailed explanations: E0106, E0515.
For more information about an error, try `rustc --explain E0106`.
warning: `variables` (bin "variables") generated 1 warning
error: could not compile `variables` (bin "variables") due to 2 previous errors; 1 warning emitted
```
错误信息中提到了我们尚未接触到的概念：lifetimes。我们将在后面讨论它。但其中包含了关键的错误信息：
```shell
this function's return type contains a borrowed value, but there is no value for it to be borrowed from
```
让我们看看`dangle`中到底发生了什么：
```rust
fn dangle() -> &String { // dangle returns a reference to a String
    let s = String::from("hello"); // s is a new String

    &s // we return a reference to the String, s
} // Here, s goes out of scope, and is dropped, so its memory goes away.
```
当`dangle`函数结束时，`s`所占用的内存将会被释放。但我们尝试返回对它的引用。这意味着这个引用将会指向一个无效的`String`。

## The Slice Type
*Slices*（切片）让你能引用集合中的一个元素序列，而不是整个集合。切片是一种引用，所以它没有所有权。
有一个小的编程问题：编写一个函数，从一个被空格分割的字符串序列中获取第一个字符串。如果这个序列中没有空格，则返回整个序列作为一个字符串。
让我们看看如果不用切片的话，我们的方法应该如何定义：
```rust
fn first_word(s: &String) -> ?
```
这个函数有一个`&String`类型的参数。我们不需要获取它的所有权（在Rust通常的写法中，函数都不会抢夺参数的所有权，除非必要情况）我们该返回什么呢？我们还没有一种方式可以表示“字符串的一部分”。然而，我们可以返回首个字符串末尾字符的下标，这是由空格来决定的。就像这样：
```rust
fn first_word(s: &String) -> usize {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return i;
        }
    }

    s.len()
}
```
现在我们能够找到第一个字符串的截止下标了，但有一个问题。我们单独返回了一个`usize`，但是它只在`&String`这个上下文中才是有意义的。也就是说，因为它是与`String`分离的一个值，因此不能保证它能否在未来一直有效。可以考虑如下情况：
```rust
fn main() {
    let mut s = String::from("hello");

    let word = first_word(&s);

    s.clear(); // this empties the String, making it equal to ""

    // 'word' still has the value '5' here, but 's' no longer has any content that we cound meaningfully use with the value '5', so 'word' is now totally invalid!
}
```
这里的数据同步问题是很容易出错的。如果我们写一个类似的`second_word`函数，管理这些索引会变得更容易出问题：
```rust
fn second_word(s: &String) -> (usize, usize) {}
```
幸运的是，Rust提供了字符串切片来解决这个问题。

### String Slices
字符串切片是对`String`的一部分的引用，它看起来像这样：
```rust
let s = String::from("hello world");

let hello = &s[0..5];
let world = &s[6..11];
```
这里的下标也是左闭右开的区间。这里的`world`是一个指针指向`s`中下标为6的位置，并且长度为5。
![指向`String`中一部分的字符串切片](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250702082752.png)

如果你想要创建一个从下标0开始的切片，则可以把0省略：
```rust
let s = String::from("hello");

let slice = &s[0..2];
let slice = &s[..2];
```
同样，如果切片包含最末尾的字符，也可以省略：
```rust
let s = String::from("hello");

let len = s.len();

let slice = &s[3..len];
let slice = &s[3..];
```
也可以头尾都省略，直接获取对整个字符串的切片：
```rust
let s = String::from("hello");

let len = s.len();

let slice = &s[0..len];
let slice = &s[..];
```
> 注意：字符串切片范围索引必须位于有效的UTF-8字符边界上。如果尝试在多字节字符的中间创建字符串切片，则会报错退出。

现在，我们可以用字符串切片来重写`first_word`函数：
```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[..i];
        }
    }

    &s[..]
}
```
现在，`first_word`函数的返回值与`s`就是绑定的。

我们再来测试一下之前那个会产生bug的情况，现在它会直接抛出一个编译时错误：
```rust
fn main() {
    let mut s = String::from("hello world");

    let word = first_word(&s);

    s.clear(); // error

    println!("the first word is: {word}");
}
```
报错信息如下：
```bash
$ cargo run 
   Compiling ownership v0.1.0 (/path/to/your/ownership)
error[E0502]: cannot borrow `s` as mutable because it is also borrowed as immutable
 --> src/main.rs:6:5
  |
4 |     let word = first_word(&s);
  |                           -- immutable borrow occurs here
5 |
6 |     s.clear();
  |     ^^^^^^^^^ mutable borrow occurs here
7 |
8 |     println!("The first word is: {}", word)
  |                                       ---- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `ownership` (bin "ownership") due to 1 previous error
```
回忆借用规则，如果我们有一个不可变引用，那么我们就不能同时再获得一个可变引用。因为`clear`会清除`s`，因此它需要获取一个可变引用。而在调用`println!`时使用了`word`中的引用`&s`，因此不可变引用仍然存活。这时`s`同时存在一个可变引用和一个不可变引用，因此编译失败。

### String Literals as Slices
回想一下我们谈过字符串字面量是存储在binary当中的。现在我们知道了切片，就可以正确理解字符串字面量：
```rust
let s = "Hello world!";
```
这里`s`的类型是`&str`，它是指向binary特殊位置的一个切片。这也是为什么字符串字面量是不可变的，因为`&str`是一个不可变的引用。

### String Literals as Parameters
经验更丰富的Rustaceaan会写出这样的方法签名，因为我们可以在`&String`和`&str`上使用相同的函数：
```rust
fn first_word(s: &str) -> &str {
```
使用切片而不是字符串更加灵活，它利用了*deref coercions*（解引用强制转换）这一特性，我们会在后面的章节讲解它。
定义一个获取字符串切片而不是一个对`String`的引用的函数会让我们的API更通用：
```rust
fn main() {
    let my_string = String::from("hello world");

    // 'first_word' works on slices of 'String's, whether partial or whole.
    let word = first_word(&my_string[0..6]);
    let word = first_word(&my_string[..]);
    // 'first_word' also works on references to 'String's, which are equivalent to whole slices of 'String's
    let word = first_word(&my_string);

    // 'first_word' works on slices of string literals, whether partial or whole.
    let word = first_word(&my_string_literal[0..6]);
    let word = first_word(&my_string_literal[..]);

    // Because string literals are string slices already, this works too, without the slice syntax!
    let word = first_word(my_string_literal);
```

### Other Slices
字符串切片是专门针对字符串的切片，当然还有更通用的切片类型，例如数组的切片：
```rust
let a = [1, 2, 3, 4, 5];

let slice = &a[1..3];

asset_eq!(slice, &[2, 3]);
```
这个切片的类型为`&[i32]`。它是一个存储了指向第一个元素的指针和长度的引用，类似字符串切片。你也可以在其他类型的集合中使用这种切片。

# Summary
所有权、借用和切片的概念确保了 Rust 程序在编译时的内存安全。Rust 语言以与其他系统编程语言相同的方式让你控制内存使用，但由于数据的所有者在超出作用域时会自动清理该数据，因此你不必编写和调试额外的代码来获得这种控制。
所有权影响 Rust 的许多其他部分，因此我们将在本书的其余部分进一步讨论这些概念。