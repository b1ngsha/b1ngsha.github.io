---
title: The Rust Programming Language：Using Structs to Structure Related Data
date: 2025-08-29 00:14:07
tags: Rust
categories: Rust
---
# Defining and Instantiating Structs
结构体与元组相似，正如在 "元组类型" 一节中讨论的那样，二者均可保存多个相关的值。与元组一样，结构体的各个部分可以是不同类型的。与元组不同的是，在结构体中你会为每一块数据命名，以清楚地表示这些值的含义。添加这些名称意味着结构体比元组更加灵活：你不必依赖数据的顺序来指定或访问实例的值。
我们可以用`struct`关键字来定义一个结构体。一个结构体的名称应该能描述它所组织的数据的意义。例如一个结构体来存储用户的账户信息：
```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```
可以这样实例化一个结构体：
```rust
fn main() {
    let user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    }
}
```
要从结构体中获取某个字段的值，我们可以使用点符号。例如使用`user.email`来访问用户的`email`字段。如果实例是可变的，我们可以通过使用点符号来给特定字段赋值，如下所示：
```rust
fn main() {
    let mut user1 = User {
        active: true,
        username: String::from("someusername123"),
        email: String::from("someone@example.com"),
        sign_in_count: 1,
    };

    user1.email = String::from("anotheremail@example.com");
}
```
需要注意，这里的整个实例都需要是可变的，Rust不会允许我们标记特定的字段为可变的。我们可以在方法体的最后创建一个结构体的实例，以隐式地返回这个新的实例：
```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username: username,
        email: email,
        sign_in_count: 1,
    }
}
```
可以看到，这里的方法参数名和字段名是相同的，重复编写会有些麻烦。幸运的是，Rust提供了一种方便的写法。

## Using the Field Init Shorthand
我们可以使用字段初始化简写语法（*field init shorthand syntax*）来重写`build_user`：
```rust
fn build_user(email: String, username: String) -> User {
    User {
        active: true,
        username,
        email,
        sign_in_count: 1,
    }
}
```

## Creating Instances from Other Instances with Struct Update Syntax
我们经常需要在另一个结构体实例的基础上创建一个新的实例，这个新的实例会包含它的大部分字段，但也会改变一些字段值。我们可以使用结构体更新语法（*struct update syntax*）来做这件事。
如果不使用这个语法：
```rust
fn main() {
    // --snip--

    let user2 = User {
        active: user1.active,
        username: user1.username,
        email: String::from("another@example.com"),
        sign_in_count: user1.sign_in_count,
    }
}
```
可以看到，我们在创建`user2`实例时复用了`user1`实例的大部分字段，除了`email`。也就是说，如果用这种写法，我们需要编写大量冗余的代码，但是其实我们只对`email`这个字段赋了一个新的值。
因此我们可以使用结构体更新语法，用更少的代码达成同样的效果：
```rust
fn main() {
    // --snip--

    let user2 = User {
        email: String::from("another@example.com"),
        ..user1
    };
}
```
在这个例子中，我们不能在创建`user2`后再使用`user1`了，因为`user1`里的`username`字段被移动到了`user2`当中。如果你给`username`和`email`都重新赋值，并在`user2`中只复用了`user1`的`active`和`sign_in_count`字段，那`user1`将仍然有效，因为`active`和`sign_in_count`字段的类型都实现了`Copy`特性。
注意，在这个例子中，我们仍然可以使用`user1.email`，因为它的值没有被移动。

## Using Tuple Structs Without Named Fields to Create Different Types
Rust还支持了看上去像元组的结构体，称为元组结构体（*Tuple structs*）。它们有结构体名称但是没有字段名，只有字段的类型。当你想要给一整个元组起名，并让它成为与其他元组不同的类型时；以及在常规结构中将每个字段命名会显得冗长或多余时，元组结构体是很有用的。
```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
}
```
这里的`black`和`origin`是不同的类型，因为它们是不同的元组结构体的实例。你定义的每个结构体都有它自己的类型，即使结构体中的每个字段可能都是相同的类型。例如，一个接收`Color`类型作为参数的函数不能接收`Point`类型作为参数，即使它们的字段类型都是三个`i32`。另外，元组结构体跟元组类似，你可以把它拆分出来，并用`.`来访问每个单独的字段。不像元组，元组结构体要求你在拆分的时候带上结构体名称。例如`let Point(x, y, z) = point`。

## Unit-Like Structs Without Any Fields

你也可以定义一个不包含任何字段的结构体。这被成为单元类结构体，因为它们的行为类似于我们在元组中提到的`()`，即单元类型。单元类结构体在你需要在某种类型上实现一个特征但是又没有任何想要存储在该类型中的数据时会很有用。例如：
```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
}
```
> Ownership of Struct Data
> 在我们上面定义的`User`结构体中，我们使用了`String`而不是`&str`。这是一个慎重的决定，因为我们想要结构体的每个实例都保存它所有的字段数据，并且只要整个结构体是有效的，这些数据也将是有效的。
> 在结构体中存储数据的引用也是可能的，但这需要使用生命周期（*lifetimes*），一个Rust特性，我们将在后面讨论它。生命周期确保了被结构体引用的数据是有效的，只要整个结构体是有效的。如果你想在结构体中使用引用却不声明生命周期，那将会出错：
```rust
struct User {
    active: bool,
    username: &str,
    email: &str,
    sign_in_count: u64,
}

fn main() {
    let user1 = User {
        active: true,
        username: "someusername@123",
        email: "someone@example.com",
        sign_in_count: 1,
    };
}
```
> 编译器会提示它需要生命周期参数：
```bash
$ cargo run
   Compiling structs v0.1.0 (file:///projects/structs)
error[E0106]: missing lifetime specifier
 --> src/main.rs:3:15
  |
3 |     username: &str,
  |               ^ expected named lifetime parameter
  |
help: consider introducing a named lifetime parameter
  |
1 ~ struct User<'a> {
2 |     active: bool,
3 ~     username: &'a str,
  |

error[E0106]: missing lifetime specifier
 --> src/main.rs:4:12
  |
4 |     email: &str,
  |            ^ expected named lifetime parameter
  |
help: consider introducing a named lifetime parameter
  |
1 ~ struct User<'a> {
2 |     active: bool,
3 |     username: &str,
4 ~     email: &'a str,
  |

For more information about this error, try `rustc --explain E0106`.
error: could not compile `structs` (bin "structs") due to 2 previous errors
```
> 我们后面会再详细讨论如何修复这些错误，但目前，我们暂时先使用`String`这种所有权类型而不是`&str`这种引用类型。

# An Example Program Using Structs
让我们编写一个计算矩形面积的程序以理解什么时候我们可能会使用到结构体。我们会以简单地使用变量开始，并逐渐重构为使用结构体来完成。
```rust
fn main() {
    let width1 = 30;
    let height1 = 50;

    println!(
        "The area of the rectangle is {} square pixels.",
        area(width1, height1)
    );
}

fn area(width: u32, height: u32) -> u32 {
    width * height
}
```
运行结果：
```bash
$ cargo run
   Compiling rectangles v0.1.0 (/path/to/your/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.33s
     Running `target/debug/rectangles`
The area of the rectangle is 1500 square pixels.
```
这段代码通过调用`area`函数计算矩形的面积，但我们可以做更多的工作让字段代码更加清晰易读。
这个`area`函数应该计算的是一个矩形的面积，但我们写的这个函数有两个参数，并且我们在程序中并没有地方明确表示这些参数是相关的。将宽度和高度组合在一起会更具可读性和管理性。我们已经在前面讨论过了一种可能的方法：使用元组。

## Refactoring with Tuples
使用元组的写法：
```rust
fn main() {
    let rect1 = (30, 50);

    println!(
        "The area of the rectangle is {} square pixels.",
        area(rect1)
    );
}

fn area(dimensions: (u32, u32)) -> u32 {
    dimensions.0 * dimensions.1
}
```
现在看起来程序好了一些，元组给我们提供了一些结构，并且我们现在只需要传递一个参数。但另一方面，这个版本的代码没有那么清晰，元组没有对元素命名，所以我们只能用下标的方式获取元素。
并且，如果我们需要规定元组中的元素顺序的话，就需要记住`width`应该在下标为`0`的位置，`height`在下标为`1`的位置（打个比方），显然这很容易出现混淆。

## Refactoring with Structs: Adding More Meaning
我们使用结构体，通过给数据打上标签来为其赋予意义。
```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        area(&rect1)
    );
}

fn area(rectangle: &Rectangle) -> u32 {
    rectangle.width * rectangle.height
}
```
这里给`area`传递的是一个`&Rectangle`而不是`Rectangle`，这样主函数中就可以保持对`rect1`的所有权，以便在调用`area`后继续使用。另外，访问借用的结构体实例的字段并不会抢占其所有权。

## Adding Useful Functionality with Derived Traits
在debug的过程中打印`Rectangle`的实例是很有用的，这让我们可以关注每个字段的值的变化。我们尝试像之前那样用`println!`这个宏来进行打印：
```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("rect1 is {}", rect1);
}
```
当我们编译这段代码则会产生错误：
```bash
error[E0277]: `Rectangle` doesn't implement `std::fmt::Display`
```
`println!`这个宏可以做很多种格式化动作，默认情况下，大括号会告诉`println!`使用`Display`这种格式：用于生成直接面向用户的输出。目前我们使用的原始类型都默认实现了`Display`，因为它们只需要直接输出它们所保存的值。但是对于结构体，`println!`要输出的内容就不那么明确了，因为有更多的显示可能性。此时Rust并不会尝试猜测我们想要做什么，并且结构体也没有提供给`println!`和`{}`占位符使用的`Display`实现。
如果我们继续阅读这个报错信息，就会发现一些help note：
```bash
   = help: the trait `std::fmt::Display` is not implemented for `Rectangle`
   = note: in format strings you may be able to use `{:?}` (or {:#?} for pretty-print) instead
```
现在，`println!`宏的调用会看起来像`println!("rect1 is {rect1:?}")`这样。大括号内的`:?`告诉`println!`我们想要使用`Debug`这种输出格式。`Debug`特性让我们能用一种有利于debug的方式打印结构体信息。
编译再次产生报错：
```bash
error[E0277]: `Rectangle` doesn't implement `Debug`
```
但编译器再次给了我们提示：
```bash
   = help: the trait `Debug` is not implemented for `Rectangle`
   = note: add `#[derive(Debug)]` to `Rectangle` or manually `impl Debug for Rectangle`
```
Rust已经提供了打印debug信息的能力，但我们需要显式地在我们的结构体中使用它。为了做到这一点，我们在结构体定义之前添加了`#[derive(Debug)]`属性，就像这样：
```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("rect1 is {rect1:?}");
}
```
现在运行就可以看到如下输出：
```bash
$ cargo run
Compiling rectangles v0.1.0 (/path/to/your/rectangles)
  Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.27s
     Running `target/debug/rectangles`
rect1 is Rectangle { width: 30, height: 50 }
```

当我们的结构体变得更大时，就可以使用`{:#?}`而不是`{:?}`，这会产生更可读的输出：
```bash
$ cargo run
Compiling rectangles v0.1.0 (/path/to/your/rectangles)
  Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.27s
     Running `target/debug/rectangles`
rect1 is Rectangle {
    width: 30,
    height: 50,
}
```

另一种以`Debug`格式打印值的方式是使用`dbg!`这个宏，它会抢占所有权（与`println!`相反，它接收的是引用）。它会打印`debug!`宏被调用的文件信息和行号，还有表达式的值，并且返回这个值的所有权。
> `dbg!`宏是在`stderr`流输出的，而`println!`宏则直接在`stdout`流进行输出。

例如，我们对赋值给`width`的值，还有赋值给`rect1`这整个实例的值感兴趣，就可以这样做：
```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let scale = 2;
    let rect1 = Rectangle {
        width: dbg!(30 * scale),
        height: 50,
    };

    dbg!(&rect1);
}
```
在`width`这里，由于`dbg!`会返回`30*scale`的所有权，因此有没有调用`dbg!`获取的表达式的值都是相同的。输出如下所示：
```rust
$ cargo run
   Compiling rectangles v0.1.0 (/path/to/your/rectangles)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.13s
     Running `target/debug/rectangles`
[src/main.rs:10:16] 30 * scale = 60
[src/main.rs:14:5] &rect1 = Rectangle {
    width: 60,
    height: 50,
}
```

除了`Debug`特性外，Rust还提供了很多特性让我们可以在`derive`中使用，这可以给我们的自定义类型添加很多有用的表现。我们将会在后续的章节中讨论如何通过这些特性实现一些自定义行为，还有如何创建我们自己的特性。同样，除了`derive`之外，Rust还有很多不同的属性。
接下来，我们来看看如何将`area`函数转化为定义在`Rectangle`类型上的`area`方法。

# Method Syntax

方法是在结构体（或是枚举和特性对象）的上下文中被定义的，它们的第一个参数都是`self`，这表示被调用方法的结构体实例。

## Defining Methods
让我们改造一下`area`函数，让它成为`Rectangle`结构体的一个方法：
```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!(
        "The area of the rectangle is {} square pixels.",
        rect1.area()
    );
}
```
为了在`Rectangle`这个上下文中定义一个函数，我们为`Rectangle`编写了一个`impl`，在`impl`中的所有内容都被关联到`Rectangle`类型上。
在`area`的方法签名中，我们使用了`&self`而不是`rectangle: &Rectangle`，它其实是`self: &Self`的缩写。在`impl`中，`Self`类型是`impl`所针对类型的别名。方法的第一个参数必须有一个名为`self`的类型为`Self`的参数，因此Rust允许你仅在`self`作为第一个参数时使用缩写。注意，我们仍然需要在`self`前使用`&`来表明该方法借用了`Self`实例，就像我们在`rectangle: &Rectangle`中所做的那样。方法可以拥有`self`的所有权，就像我们在这里做的那样不变地借用`self`，或者可变地借用`self`，就像我们对待任何其他的参数一样。
> Where's the `->` Operator?
> 在C和C++中，有两种调用方法的方式：如果你在对象上直接调用方法的话用的是`.`；如果是在对象的指针上用的则是`->`，并且需要先对指针进行解引用。也就是说，如果`object`是一个指针，那么`object->something()`类似于`(*object).something()`。
> Rust没有`->`这个操作符；取而代之的是，Rust有一个叫自动引用与解引用（*automatic referencing and dereferencing*）的特性。调用方法是Rust表现它的其中一个场景。
> 它是这样做的：如果你像`object.something()`这样调用一个方法，Rust会自动添加`&`，`&mut`或者`*`，让`object`能匹配方法签名。也就是说，`p1.distance(&p2)`与`(&p1).distance(&p2)`是相同的。
> 因为方法都有很清晰的接收者——`self`的类型。只要给到接收者和方法名称，Rust就一定可以找到这个方法是要读（`&self`），还是要修改（`&mut self`），还是要变更所有权（`self`）。Rust 对方法接收者隐式借用的处理，在实践中是使所有权使用变得更加人性化的重要部分。

## Methods with More Parameters
让我们在`Rectangle`这个结构体上实现另一个方法。这次我们想要编写一个方法判断一个矩形是否在另一个矩形的内部。如下所示：
```rust
fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };
    let rect2 = Rectangle {
        width: 10,
        height: 40,
    };
    let rect3 = Rectangle {
        width: 60,
        height: 45,
    };

    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
    println!("Can rect1 hold rect3? {}", rect1.can_hold(&rect3));
}
```
预期的输出如下：
```bash
Can rect1 hold rect2? true
Can rect1 hold rect3? false
```
让我们在`impl`中加入`can_hold`方法：
```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

## Associated Functions
在`impl`块中被定义的所有函数都被称为关联函数（*associated functions*），因为它们都被关联到了`impl`后的类型上。我们可以定义没有`self`作为第一个参数的关联函数（因此它们不属于方法），因为它们不需要这个类型的实例来做处理。我们已经使用过了一个像这样的函数：定义在`String`类上的`String::from`函数。
不是方法的关联函数经常被用作构造器。它们通常被称作`new`，但`new`不是一个特殊的名字，也没有被嵌入到语言当中。例如我们想给`Rectangle`结构体提供一个名叫`square`的关联函数，它只接收一个参数并将其同时用做宽和高：
```rust
impl Rectangle {
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}
```
`Self`关键字是当前类型的别称。
为了调用这个关联函数，我们使用`::`语法，例如`let sq = Rectangle::square(3);`。这个函数由结构体命名空间命名：`::`语法用于关联函数和模块创建的命名空间。我们将在后面的章节讨论模块。

## Multiple `impl` Blocks
每个结构体都被允许拥有多个`impl`函数块。例如：
```rust
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```
这里分开写和合起来写没什么区别，但这种语法是合法的。我们将在后面的章节看到多个`impl`块是有用的的场景。

# Summary
结构体让你可以创建对你的领域有意义的自定义类型。通过使用结构体，你可以将相关的数据片段紧密连接在一起，并为每个片段命名，以使你的代码更清晰。在 impl 块中，你可以定义与你的类型相关的函数，而方法是一种关联函数，让你可以指定你的结构体实例所具有的行为。
但是结构体并不是创建自定义类型的唯一方式：让我们转向Rust的枚举特性，为你的工具箱添加另一个工具。