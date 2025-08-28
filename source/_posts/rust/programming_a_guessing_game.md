---
title: The Rust Programming Language：Programming a Guessing Game
date: 2025-08-29 00:09:02
tags: Rust
categories: Rust
---

在本章中，我们将会从零开始实现一个经典的入门级程序——猜数字小游戏，目的是在编写的过程中快速熟悉Rust中的各个概念。这个小游戏的主要规则为：随机生成一个1到100的数字，然后提示玩家进行猜测，当玩家输入一个数字后，需要提醒玩家做出的猜测太大了或者是太小了，直到正确地猜到目标数。
## Setting Up a New Project
首先，让我们新建一个工程：
```shell
$ cargo new guessing_game
$ cd guessing_game
```
此时就会生成如第一章中所提到的目录结构，我们将在*src/main.rs*这个文件中编写代码。
## Processing a Guess
游戏的第一个部分是需要获取玩家的输入，处理这个输入，并且检查这个输入是否是我们期望的格式（整型数）。那么首先，我们需要让玩家输入一个猜测：
```rust
use std::io;

fn main() {
    println!("Guess the number!");
    
    println!("Please input your guess.");
    
    let mut guess = String::new();
    
    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");
    
    println!("You guessed: {}", guess);
}
```
这段代码包含了很多内容，让我们来一行行地分析它。
为了获取用户的输入，我们需要引入`io`库。这个`io`库来自于称为`std`的标准库：
```rust
use std::io;
```
Rust在标准库中定义了很多内容，这些内容会默认被引入到程序中，称为预导入（*prelude*）。如果你需要使用的内容没有被包含在prelude里面，就需要显式地用`use`将其引入到程序中。`std::io`这个标准库提供了很多有用的功能，包含接收用户输入的能力。

```rust
fn main() {
```
`main`函数是程序的入口。`fn`用于声明一个新的函数。

### Storing Values with Variables
接下来，我们创建一个变量来储存用户的输入：
```rust
let mut guess = String::new();
```
这简单的一行里面也包含了很多内容。我们可以使用`let`来创建变量，例如：
```rust
let apples = 5;
```
这里创建了一个新的变量`apples`并将其赋值为5。在Rust中，**变量在默认情况下是不可变的（常量），如果要让其可变，则需要在变量名前添加`mut`**：
```rust
let apples = 5; // immutable
let mut bananas = 5; // mutable
```

回到猜数字程序中，我们现在知道了`let mut guess`创建了一个可变的变量`guess`，并将其赋值为了`String::new`函数的调用结果，一个`String`实例。`String`是标准库提供的字符串类型，它是一个可增长的、UTF-8编码的文本字符串。
`::new`中的`::`语法表示`new`是`String`类型中的一个关联函数（associated function）。**associated function是实现在类型上的函数**。`new`函数创建了一个新的，空的字符串。
> associated function <-> static function

### Receiving User Input
现在我们已经引入了`io`库，我们将调用其中的`stdin`函数来获取用户输入：
```rust
io::stdin()
    .read_line(&mut guess)
```
如果我们没有用`use std::io`来引入`io`库，我们也可以用`std::io::stdio`来调用`stdin`函数。这个函数返回了一个`std::io::stdin`实例，让我们可以处理用户在终端中的标准输入。
下一行，`.read_line(&mut guess)`调用了`read_line`方法以获取用户输入。这里传入的字符串参数需要是可变的，以便该方法更改字符串内容。**`&`这个符号表示传入的参数是一个引用**，这能直接指向数据，避免了将数据多次地拷贝到内存当中。引用是很复杂的功能，Rust主要的优点之一就是它在使用引用时的安全性和简便性。目前你不需要知道太多关于引用的细节，只需要知道，**跟变量一样，引用在默认情况下是不可变的**，因此你需要写`&mut guess`而不是`&guess`。

### Handling Potential Failure with Result
我们继续分析上面的这行代码，它的下一部分是：
```rust
    .expect("Failed to read line");
```
同上面所说的那样，`read_line`将用户的输入接收到了，但它返回的是一个`Result`，这是一个枚举值（enum），包含`Ok`和`Err`。显然，我们需要对`Response`进行错误处理。`Ok`表示操作成功，并且其中会包含成功生成的值，而`Err`则表示操作失败，其中会包含错误信息。
`expect`是定义在`Response`类型中的一个方法。如果`Result`是`Err`，`expect`将会导致程序崩溃并将参数作为错误信息进行展示。而如果`Result`是`Ok`，`expect`则会返回它所包含的值，在当前情况下，这个值应该是用户输入的字节数。
如果你没有调用`expect`，这个程序也能正常编译，但是你会接收到一个warning：
```shell
$ cargo build            
  Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
warning: unused `Result` that must be used
  --> src/main.rs:10:5
   |
10 | /     io::stdin()
11 | |         .read_line(&mut guess);
   | |______________________________^
   |
   = note: this `Result` may be an `Err` variant, which should be handled
   = note: `#[warn(unused_must_use)]` on by default
help: use `let _ = ...` to ignore the resulting value
   |
10 |     let _ = io::stdin()
   |     +++++++

warning: `guessing_game` (bin "guessing_game") generated 1 warning
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.40s
```
Rust警告你没有使用`read_line`返回的`Result`值，这表示你没有对可能产生的错误进行处理。
正确的警告处理方式是编写错误处理相关的代码，但是在当前的程序中我们想在错误发生时让程序crash掉，因此我们直接使用了`expect`。

### Printing Values with `println!` Placeholders
目前还没有分析的就只剩下一行：
```rust
    println!("You guessed: {}", guess);
```
这里的`{}`是一个占位符，会将`guess`的值传入到占位符中。
此外，也可以像这样直接用一次`println!`调用来打印一个变量和一个表达式的结果：
```rust
let x = 5;
let y = 10;

println!("x = {x} and y + 2 = {}", y + 2);
```

### Testing the First Part
让我们测试一下程序的第一部分，运行`cargo run`：
```shell
$ cargo run
  Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
   Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.16s
    Running `target/debug/guessing_game`
Guess the number!
Please input your guess.
1
You guessed: 1
```

## Generating a Secret Number
接下来，我们需要生成一个数字以供用户进行猜测，这个数字在每次启动程序时都应该是不同的。Rust没有在标准库中包含随机数生成的能力，但是Rust团队提供了一个`rand` crate来支持它。

### Using a Crate to Get More Functionality
一个crate是一个Rust源代码文件的集合。我们现在构建的项目是一个*binary crate*，它是可执行的。而`rand` crate是一个*library crate*，其中包含的代码旨在被其他程序使用，无法单独执行。
在我们在编写使用`rand`的代码之前，我们需要修改`Cargo.toml`文件来引入`rand` crate作为依赖：
```toml
[dependencies]
rand = "0.8.5"
```
这里的`0.8.5`是`^0.8.5`的缩写，表示版本至少是0.8.5但低于0.9.0。
现在，无需更改任何代码，让我们编译这个程序：
```shell
$ cargo build
  Compiling cfg-if v1.0.0
  Compiling libc v0.2.172
  Compiling zerocopy v0.8.25
  Compiling getrandom v0.2.16
  Compiling rand_core v0.6.4
  Compiling ppv-lite86 v0.2.21
  Compiling rand_chacha v0.3.1
  Compiling rand v0.8.5
  Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
  Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.02s
```
当我们包含一个外部依赖时，Cargo会从*registry*中获取到该依赖所需的所有最新的版本数据，这些数据是[Crates.io](crates.io)的副本。Crates.io是Rust生态中人们发布他们的开源Rust项目，以供他人使用的地方。
当更新完registry之后，Rust会下载没有下载过的crates并下载每个crate所依赖的crates。
如果你没有更新`[dependencies]`中的crates，即使再次运行`cargo build`也不会再次触发下载依赖的动作，甚至修改代码后再`cargo build`也是同样的。

### Ensuring Reproducible Builds with the *Cargo.lock* File
当第一次构建项目时，Cargo会自动找出符合Cargo.toml中条件的所有依赖项版本，然后将其写入Cargo.lock文件。当将来构建项目时，Cargo会看到Cargo.lock文件存在，并会使用其中指定的版本，而不是重新进行版本计算。这可以实现可重现的构建。

### Updating a Crate to Get a New Version
当你想要升级一个crate时，Cargo提供了`update`命令，这将忽视*Cargo.lock*文件并找出符合*Cargo.toml*中条件的依赖的最新版本。在当前的情况下，Cargo将会寻找大于0.8.5并且小于0.9.0的`rand`版本。也就是说，假如现在`rand`存在0.8.6和0.9.0这两个版本，那么`cargo update`将会将`rand`升级到0.8.6。

### Generating a Random Number
现在我们安装好了依赖，就可以使用`rand`来生成一个随机数了：
```rust
use std::io;
use rand::Rng;

fn main() {
    println!("Guess the number!");
    
    let secret_number = rand::thread_rng().gen_range(1..=100);
    
    println!("The secret number is: {secret_number}");
    
    println!("Please input your guess.");
    
    let mut guess = String::new();
    
    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");
        
    println!("You guessed: {guess}");
}
```
首先我们添加了`use rand::Rng;`。Rng特性（trait）定义了随机数生成器实现的方法。
接下来我们在中间添加了两行代码。第一行我们调用了`rand::thread_rng()`函数来获取我们将要使用的随机数生成器，这个生成器是在当前线程本地执行并由操作系统进行seed的。然后我们在这个生成器上调用了`gen_range`方法，这个方法是由`Rng`特性定义的，它接收了一个范围表达式作为参数并生成了一个范围内的随机数。我们使用的这种**范围表达式的语法为`start..=end`，它是一个闭区间。**
第二行则是将这个随机数进行打印。
现在我们尝试多次运行这个程序：
```shell
$ cargo run
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.01s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 47
Please input your guess.
47
You guessed: 47

$ cargo run
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.01s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 74
Please input your guess.
74
You guessed: 74

$ cargo run   
   Compiling guessing_game v0.1.0 (/Volumes/SN580/Users/cheyne/Documents/study/rust/the_rust_programming_language/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.30s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 87
Please input your guess.
87
You guessed: 87
```
可以看到每次运行都生成了一个不同的，在1到100这个范围内的随机数。

## Comparing the Guess to the Secret Number
现在我们有了用户的输入和一个随机数，就可以对它们进行比较了。这一步的代码如下所示，但是它暂时无法成功编译：
```rust
use rand::Rng;
use std::cmp::Ordering;
use std::io;

fn main() {
    // --snip--

    println!("You guessed: {guess}");

    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }
}
```
首先我们用另一个`use`将`std::cmp::Ordering`这一类型从标准库中导入。这个`Ordering`类型也是一个枚举值，包含`Less`，`Greater`和`Equal`。
然后，`cmp`方法对两个值进行了比较，它可以在任何可以被比较的值上进行调用。它接收一个你想比较的值的引用，在这里将`guess`与`secret_number`进行比较。它将返回一个`Ordering`作为比较结果，我们使用了`match`表达式来对比较结果进行匹配，根据结果来决定下一步将执行哪一个分支的逻辑。
> match <-> switch

一个`match`表达式由*arms*构成。一个arm由一个pattern和在给定的值符合该arm的pattern时应运行的代码所组成。Pattern和`match`的构造是Rust的强大特性：它们让你能处理代码可能遇到的各种情况，并**确保你处理了所有的情况**。

然而，这段代码并不能成功运行：
```shell
$ cargo build
  Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
error[E0308]: mismatched types
   --> src/main.rs:22:21
    |
22  |     match guess.cmp(&secret_number) {
    |                 --- ^^^^^^^^^^^^^^ expected `&String`, found `&{integer}`
    |                 |
    |                 arguments to this method are incorrect
    |
    = note: expected reference `&String`
               found reference `&{integer}`
note: method defined here
   --> /path/to/your/.rustup/toolchains/stable-aarch64-apple-darwin/lib/rustlib/src/rust/library/core/src/cmp.rs:964:8
    |
964 |     fn cmp(&self, other: &Self) -> Ordering;
    |        ^^^

For more information about this error, try `rustc --explain E0308`.
error: could not compile `guessing_game` (bin "guessing_game") due to 1 previous error
```
错误信息中显示存在不匹配的类型。Rust具有强大的静态类型系统，然而，它也具有类型推断的能力。当我们编写`let mut guess = String::new()`时，Rust能够推断出`guess`应该是一个`String`，并且不会要求我们显式编写出这个类型。而对于整型数字而言，除非另有说明，Rust默认使用`i32`类型，这里的`secret_number`就是这个类型，除非在其他地方添加类型信息使Rust推断出不同的数据类型。因此，这里的错误原因就是Rust不能对字符串和数字这两种类型进行比较。
所以，我们需要将用户输入从`String`类型转为数字类型：
```rust
    // --snip--

    let mut guess = String::new();

    io::stdin()
        .read_line(&mut guess)
        .expect("Failed to read line");

    let guess: u32 = guess.trim().parse().expect("Please type a number!");

    println!("You guessed: {guess}");

    match guess.cmp(&secret_number) {
        Ordering::Less => println!("Too small!"),
        Ordering::Greater => println!("Too big!"),
        Ordering::Equal => println!("You win!"),
    }

```
这里我们又创建了一个不可变的变量`guess`，但是我们不是在之前已经定义过一个`guess`变量了吗？这就涉及到了Rust的另一个特性——*Shadowing*，它能允许我们用一个新的`guess`去覆盖旧的那个。在这里，我们可以直接复用`guess`这个变量名而不是创建出两个不同的变量`guess_str`和`guess`。这个特性在你想要将变量从一个类型转换到另一个类型的时候是很常用的。
`trim`方法比较常见，当用户输入`5`并按下回车键时，`guess`接收到的值将会是`5\n`（在Windows上为`5\r\n`），`trim`可以将首尾的空格和回车键等删除掉，只返回`5`。
字符串上的`parse`方法用于将其转换为另一种类型。在这里，我们将其转换为数字。通过`let guess: u32`，我们告诉了Rust我们想要的确切的数字类型为`u32`。
此外，这里的`u32`和与`secret_number`的比较也意味着Rust会将`secret_number`的类型也推断为`u32`。因此，现在的比较将是在两个相同类型的值之间进行的。
而当用户输入无法被转换成数字时，`parse`将会失败，这里采用了跟之前相同的策略，用`expect`来接收`parse`返回的`Result`值，当为`Err`时则表示类型转换失败，`expect`会直接将程序crash，而如果为`Ok`，`expect`则会获取到转换后到值，并将其赋值给`guess`。

现在让我们再次运行这段程序：
```rust
$ cargo run  
   Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.36s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 90
Please input your guess.
20
You guessed: 20
Too small!
```
现在，我们能够正确执行猜数字的操作了，但是还存在一个问题，就是用户只能够做出一次猜数字的动作，因此我们需要再加入循环的逻辑。

## Allowing Multiple Guesses with Looping
`loop`关键字会启动一个死循环，这能让用户能不断地进行猜数字的操作：
```rust
    // --snip--

    println!("The secret number is: {secret_number}");

    loop {
        println!("Please input your guess.");

        // --snip--

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => println!("You win!"),
        }
    }
}
```
但是此时，用户只能够通过`ctrl+c`的快捷键或是输入非数字来强制退出程序（例如`quit`）。而我们所期望的是用户在猜到目标数字时就可以退出程序，因此还需要加上退出这个`loop`的逻辑。

### Quitting After a Correct Guess
我们可以使用`break`来退出循环：
```rust
        // --snip--

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```
这样，当用户正确猜中目标数字时就可以直接退出循环了，在这里也就意味着退出程序。

### Handling Invalid Input
为了进一步完善游戏的行为，而不是在用户输入非数字时都使程序崩溃，我们让程序忽略用户的非数字输入，这样用户就可以继续进行猜测：
```rust
        // --snip--

        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        println!("You guessed: {guess}");

        // --snip--

```
由于`Result`也是一个枚举值，因此可以采用和`Ordering`类似的方式，使用`match`表达式来进行处理。值得注意的是，在`Err(_)`中，`_`是一个通配符，也就是说我们想匹配所有的`Err`值，无论它们里面包含的是什么信息。

现在我们的程序应该能够像我们期望的那样运行了：
```shell
$ cargo run
   Compiling guessing_game v0.1.0 (/path/to/your/guessing_game)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.17s
     Running `target/debug/guessing_game`
Guess the number!
The secret number is: 15
Please input your guess.
1
You guessed: 1
Too small!
Please input your guess.
2
You guessed: 2
Too small!
Please input your guess.
16
You guessed: 16
Too big!
Please input your guess.
15
You guessed: 15
You win!
```
我们成功地完成了这个猜数字程序，但是还需要再做一个小调整。可以看到，现在程序会将目标随机数打印出来，这是用于调试的，因此我们应该将这一行删掉，最终代码如下：
```rust
use rand::Rng;
use std::cmp::Ordering;
use std::io;

fn main() {
    println!("Guess the number!");

    let secret_number = rand::thread_rng().gen_range(1..=100);

    loop {
        println!("Please input your guess.");

        let mut guess = String::new();

        io::stdin()
            .read_line(&mut guess)
            .expect("Failed to read line");

        let guess: u32 = match guess.trim().parse() {
            Ok(num) => num,
            Err(_) => continue,
        };

        println!("You guessed: {guess}");

        match guess.cmp(&secret_number) {
            Ordering::Less => println!("Too small!"),
            Ordering::Greater => println!("Too big!"),
            Ordering::Equal => {
                println!("You win!");
                break;
            }
        }
    }
}
```
至此就顺利完成了这个程序，Congratulations！

## Summary
我们在编写这个小项目的过程中使用到了很多Rust的新语法，例如`let`，`match`等等，目前我们只是匆匆一瞥，大概知道了它们的使用方式，关于更详细的内容我们将在后续的章节中深入地进行学习。