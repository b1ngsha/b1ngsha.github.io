---
title: Rust学习笔记（1）: Getting Started
date: 2025-05-01 17:52:00
tags: Rust
categories: Rust
---

## Introduction
顶层的工程化设计与对底层的控制在编程中往往是互斥的，而Rust这个编程语言挑战了这一矛盾。通过平衡强大的技术能力和良好的开发体验，Rust让你可以在控制底层细节的同时，不必承受传统编程语言在这一方面的所有麻烦。
众所周知，在更底层的代码中，很容易受到一些微妙的错误的影响，这些错误在传统的编程语言中通常只能通过广泛的测试和严格的code review来发现。而在Rust中，**编译器**充当了守门员的角色，通过**拒绝编译这些存在错误的代码（包括并发错误）**，让开发者们可以更专心于程序的逻辑，而不是花大把的时间去找这些潜在的bug。

## Installation
第一步当然是需要先安装Rust。我们将使用`rustup`这一命令行工具来管理Rust版本和相关的工具。
（以下安装步骤基于macOS）
```shell
$ curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```
这行命令将会下载一个脚本并启动对Rust相关工具的安装，包括Rust编译器，包管理工具`Cargo`和`rustup`工具链。当安装完毕后，你将会看到：
```text
Rust is installed now. Great!
```

此外，你还需要一个链接器（linker），被Rust用于将编译的结果输出到文件中。如果你遇到了链接错误，你就应该需要安装一个C编译器，其中通常包含了链接器。C编译器是很有用的，因为一些常见的Rust包依赖于C语言。你可以通过以下命令安装一个C编译器（通常已经安装）：
```shell
$ xcode-select --install
```

检查Rust是否正确安装：
```shell
$ rustc --version
```

需要更新通过`rustup`安装的Rust是很容易的，只需要运行：
```shell
$ rustup update
```
如果需要卸载Rust和`rustup`，则只需要运行：
```
$ rustup self uninstall
```

## Hello, World!
按照传统惯例，安装好Rust后，Let's do the Hello World thing！
省略掉创建文件夹，创建文件等等的操作...
```rust
fn main() {
    println!("Hello, world!");
}
```
编译执行：
```shell
$ rustc main.rs
$ ./main
Hello, world!
```
> Congratulations! Welcome to Rust!

其中，`println!("Hello, world!");`这一行包含了一个很重要的技术细节。
在这里，`println!`调用的是Rust的宏，而不是一个函数。如果是函数调用，那么应该是`println()`。关于Rust的宏，我们会在后续的篇章中详细讨论，暂时我们只需要知道 **`!`这个符号的出现意味着你在调用一个宏而不是一个函数。**

接下来，我们来检验一下我们为了运行这个程序而做的每一步操作。
首先，我们需要进行源代码的编译，这是用`rustc`命令完成的：
```shell
$ rustc main.rs
```
这和C++中的`gcc`和`clang`很类似。编译成功后，Rust输出了一个二进制的可执行文件。
现在，你就可以运行这个文件：
```shell
$ ./main
```
从此可以看出，与C++、Golang类似，Rust是一种提前编译语言（*ahead-of-time compiled* language），这意味着你可以编译一个程序并将可执行文件交给其他人，他们可以在没有安装Rust环境的情况下运行它。

## Hello, Cargo!
Cargo是Rust的构建系统和包管理器，在后续的章节中，我们都将假设你在使用Cargo。我们已经在前面安装好了，可以用以下指令确认它是否成功安装：
```rust
$ cargo --version
```

让我们利用Cargo来创建一个新项目并观察它与我们刚才创建的“Hello World”项目有什么不同。运行：
```shell
$ cargo new hello_cargo
$ cd hello_cargo
```
第一条命令创建了一个新的项目叫做*hello_cargo*。进入目录后，你会看到Cargo生成了两个文件和一个目录：
```shell
 hello_cargo
    ├── Cargo.toml
    └── src
        └── main.rs
```
它同时还初始化了一个新的Git仓库，包含 *.gitignore*文件。如果你在一个已存在的Git仓库里运行`cargo new`，那么Git相关的文件将不会被生成；你可以用`cargo new --vcs=git`来重写这个动作。
> 当然，如果你不想用Git来做版本控制，你可以通过`--vcs`来使用其他的。

打开*Cargo.toml*文件，你可以看到以下内容：
```toml
[package]
name = "hello_cargo"
version = "0.1.0"
edition = "2024"

[dependencies]
```
第一行中`[package]`表示这一节指定了包相关的配置，接下来的三行设置了Cargo为了编译我们的程序所需要的配置：*name*，*version*和*edition*。
> About *edition*:
> 每两到三年，Rust团队会发布一个新的Rust *edition*，这将会包含这期间的所有新特性。目前已经发布了：Rust 2015，Rust 2018，Rust 2021和Rust 2024。
> 这里的`edition`字段指定了编译器为你的代码使用哪个edition。如果不存在，则默认使用`2015`。
> 绝大部分的特性都可以在所有edition上使用，并且所有的Rust编译器版本都支持该编译器版本发布之前存在的任何edition，并且他们可以将任何支持这些editions的crates连接在一起。如果，或者说除非，你想要使用新的edition的一些新特性，例如引入的新的关键字，那么你就需要将项目的edition进行切换。

最后一行中的`[dependencies]`表示这一节指定了项目的依赖项。在Rust中，依赖项被称为*crates*，目前我们还不需要使用任何的依赖。

现在，打开*main.rs*可以看到，Cargo已经为你生成了一个Hello World项目：
```rust
fn main() {
    println!("Hello, world!");
}
```
Cargo希望你把源代码都放到*src*文件夹下，顶层目录只用于存放README，配置文件等等与代码不相干的文件。
如果你没有通过Cargo来创建项目，但是想把它转换成一个用Cargo管理的项目，你可以把你的源代码都放到*src*文件夹下，然后创建类似的*Cargo.toml*文件。一个获取*Cargo.toml*文件的快捷方式是运行`cargo init`，这会帮你自动创建它。

现在，让我们来看看用Cargo构建运行Hello World项目与之前有什么不同。在项目的根目录下，你可以用以下的命令来构建项目：
```shell
$ cargo build
  Compiling hello_cargo v0.1.0 (/path/to/your/hello_cargo)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.50s
```
这个命令创建了一个可执行文件，并将其输出到了*target/debug/hello_cargo*路径下，而不是当前目录。因为默认的构建方式是debug级别，所以Cargo把这个二进制文件放到了*debug*目录下。你可以运行这个可执行文件：
```shell
$ ./target/debug/hello_cargo
Hello, world!
```
第一次运行`cargo build`还使Cargo在根目录下创建了一个新的文件：*Cargo.lock*。这个文件将会跟踪项目中依赖项的确切版本。你永远不需要手动去更改这个文件，Cargo会帮你管理这个文件中的内容。
> 看上去和poetry管理包的方式很类似。

我们可以直接通过`cargo run`来编译源代码并执行生成的可执行文件：
```shell
$ cargo run
   Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
    Running `target/debug/hello_cargo`
Hello, world!
```
可以看到，这里我们没有看到Cargo编译这一动作相关的输出，这是因为Cargo能检测到源代码没有发生变化，所以它不会再重新构建，而只是运行之前生成的可执行文件。如果我们修改一下源代码：
```rust
fn main() {
    println!("Hello, rust!");
}
```
就可以看到Cargo在运行前重新做了一次编译：
```shell
$ cargo run
   Compiling hello_cargo v0.1.0 (/path/to/your/hello_cargo)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.52s
     Running `target/debug/hello_cargo`
Hello, rust!
```

Cargo还提供了`cargo check`这一命令，这个命令会快速检查你的源代码，确保它能够正常编译，但是不会生成可执行文件：
```shell
$ cargo check
   Checking hello_cargo v0.1.0 (/path/to/your/hello_cargo)
   Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.36s
```

当你的项目准备好发布后，就可以使用`cargo build --release`来编译它，这会自动做一些优化策略。这个命令会创建一个可执行文件在*target/release*目录下。这些优化策略会让你的Rust代码运行得更快，但是它们会延长编译所需的时间。

## 总结
我们已经开启了我们的Rust之旅！在本章中，我们学习了：
- 如何安装最新版本的Rust
- 如何直接使用`rustc`来编译并执行Rust程序
- 如何创建并运行一个Cargo项目
在下一章，我们将会通过一个小游戏来对Rust做进一步的熟悉。