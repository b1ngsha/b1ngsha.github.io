---
title: The Rust Programming Language：Managing Growing Projects with Packages, Crates and Modules
date: 2025-09-03 01:46:17
tags: Rust
categories: Rust
---
## Packages and Crates
crate 是 Rust 编译器执行代码的最小单位。即使你直接用`rustc`执行一个源文件，编译器也会认为这个文件是一个 crate。Crates 可以包含模块，并且模块可能会被定义在当前 crate 以外的文件当中。

crate 可以分为两种：binary crate 和 library crate。Binary crate 是可以被编译为可执行文件的，每个都必须包含 main 函数。
而 library crate 没有 main 函数，他们不会被编译为可执行文件，它们只提供一些能力。例如，`rand`这个 crate 就提供了生成随机数的能力。

一个 package 中会包含很多 crates。一个包中包含了 Cargo.toml 文件，描述如何构建这些 crates。Cargo 实际上也是一个用于构建代码的命令行工具的 binary crate。Cargo package 也包含了一个被 binary crate 依赖的 library crate。
一个 package 可以包含很多 binary crate，但最多只能包含一个 library crate。一个 package 至少必须包含一个 crate，whether library or binary。

让我们看看创建一个 package 的时候会发生什么。首先我们先输入`cargo new my-project`：
```shell
$ cargo new my-project
     Created binary (application) `my-project` package
$ ls my-project
Cargo.toml
src
$ ls my-project/src
main.rs
```
打开 Cargo.toml 可以看到没有提到 src/main.rs。Cargo 会默认 src/main.rs 是与 package 同名的 binary crate 的 crate root。
类似地，如果 Cargo 发现目录中包含 src/lib.rs，就说明包含与 package 同名的 library crate，src/lib.rs 是它的 crate root。Cargo 会把 crate root 文件传递给`rustc`以构建 library 或 binary。

这里的 package 只包含了 src/main.rs，意味着它只包含一个名叫`my-project`的 binary crate。如果一个包中同时包含 src/main.rs 和 src/lib.rs，那么它就有两个 crates：一个 binary 和一个library，它们的名字都与 package 相同。一个 package 可以拥有很多 binary crates，把这些文件都放在 src/bin 当中：每个文件都是一个单独的 binary crate。

# Defining Modules to Control Scope and Privacy
## Modules Cheat Sheet
这里提供了一个快速的参考，关于 modules，paths，`use` 关键字，和`pub`关键字是如何在编译器中工作的，还有大部分开发者是如何组织他们的代码的。
- 从 crate root 开始。
- 声明 modules：在 crate root file 中，你可以声明新的modules；可以用`mod garden;`声明一个“garden”模块。编译器在这些地方寻找这个模块的代码：
    - Inline，在替换掉`mod garden`后的分号的花括号中，就像这样：`mod garden {...}`
    - src/garden.rs 中
    - src/garden/mod.rs 中
- 声明子模块：在 crate root 以外的任意文件中，你可以声明子模块。例如，你可能会在 src/garden.rs 中声明`mod vegetables;`。编译器将会在以父模块命名的文件夹的这些地方寻找子模块的代码：
    - Inline，在替换掉`mod vegetables`后的分号的花括号中
    - src/garden/vegetables.rs 中
    - src/garden/vegetables/mod.rs 中
- 模块中的代码路径：当一个模块是你的 crate 中的一部分时，只要 privacy rules 允许，你可以使用代码路径，从同一个 crate 中的任意一个其他地方引用那个模块中的代码。例如，在 garden vegetables 模块中的`Asparagus`类型会在`crate::garden::vegetables::Asparagus`中被找到。
- Private vs. public：默认情况下，模块中的代码对于它的父模块来说是 private 的。为了让模块 public，用`pub mod`声明它而不是`mod`。同样地，如果要让 public module 中的内容也 public，在它们的定义前面使用`pub`。
- `use`关键字：在一个作用域内，`use`关键字创建快捷方式以减少长路径的重复。在任何可以引用`crate::garden::vegetables::Asparagus`的作用域中，你可以使用`use crate::garden::vegetables::Asparagus;`来创建一个快捷方式，从此你只需要写`Asparagus`来在该作用域中使用该类型。

## Grouping Related Code in Modules
以 restaurant 为例，我们可以用嵌套的模块来组织它的功能。创建一个新的 library：`carno new restaurant --lib`。然后定义一些模块和方法签名：
```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}
        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {}
        fn serve_order() {}
        fn take_payment() {}
    }
}
```
前面我们提到 src/main.rs 和 src/lib.rs 被称为 crate roots。起这个名字的原因是它们中的任意一个会构造模块结构的根部，一个叫做`crate`的模块：
```shell
crate
 └── front_of_house
     ├── hosting
     │   ├── add_to_waitlist
     │   └── seat_at_table
     └── serving
         ├── take_order
         ├── serve_order
         └── take_payment
```
模块树可能让你想起文件系统的目录树，这个比喻很恰当，我们就应该用像这样的方式来使用模块组织代码。

# Paths for Referring to an Item in the Module Tree
可以用相对路径和绝对路径来查找一个 item。它们都由一个或多个标识符组成，标识符之间用双冒号分隔。

```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}
    }
}

pub fn eat_at_restaurant() {
    // Absolute path
    crate::front_of_house::hosting::add_to_waitlist();

    // Relative path
    front_of_house::hosting::add_to_waitlist();
}
```
这里编译不会通过，是因为 hosting 这个 mod 是 private 的，我们无法访问其中的 add_to_waitlist 方法。
父模块中的items 不能使用子模块中的 private items，但是子模块中的 items 可以使用祖先模块中的 items。

## Exposing Paths with the `pub` keyword
把上面这个例子修改一下：
```rust
```rust
mod front_of_house {
    pub mod hosting {
        fn add_to_waitlist() {}
    }
}

pub fn eat_at_restaurant() {
    // Absolute path
    crate::front_of_house::hosting::add_to_waitlist();

    // Relative path
    front_of_house::hosting::add_to_waitlist();
}
```
现在我们把 hosting mod 设置为了 public，但此时编译仍不通过。因为让模块 public 并不会让内容 public。
最终，修改为 `pub fn add_to_waitlist` 即可编译通过了。

## Starting Relative Paths with `super`
```rust
fn deliver_order() {}

mod back_of_house {
    fn fix_incorrect_order() {
        cook_order();
        super::deliver_order();
    }

    fn cook_order() {}
}
```

## Making Structs and Enums Public
```rust
mod back_of_house {
    pub struct Breakfast {
        pub toast: String,
        seasonal_fruit: String,
    }

    impl Breakfast {
        pub fn summer(toast: &str) -> Breakfast {
            Breakfast {
                toast: String::from(toast),
                seasonal_fruit: String::from("peaches"),
            }
        }
    }
}

pub fn eat_at_restaurant() { 
    // Order a breakfast in the summer with Rye toast. 
    let mut meal = back_of_house::Breakfast::summer("Rye"); 
    // Change our mind about what bread we'd like. 
    meal.toast = String::from("Wheat"); 
    println!("I'd like {} toast please", meal.toast); 
    
    // The next line won't compile if we uncomment it; we're not allowed 
    // to see or modify the seasonal fruit that comes with the meal.
    // meal.seasonal_fruit = String::from("blueberries"); 
}
```
对于结构体，需要进行字段级别的 public 声明。

而对于 enum，则只需要将整体声明为 public 即可：
```rust
mod back_of_house {
    pub enum Appetizer {
        Soup,
        Salad,
    }
}

pub fn eat_at_restaurant() {
    let order1 = back_of_house::Appetizer::Soup; 
    let order2 = back_of_house::Appetizer::Salad; 
}
```

# Bringing Paths into Scope with the `use` Keyword
`use` 可以用于简化一长串的 path：
```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

以下代码无法编译成功：
```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting;

mod customer {
    pub fn eat_at_restaurant() {
        hosting::add_to_waitlist();
    }
}
```
因为 hosting 没有被引入到 customer 模块中。

## Providing New Names with the `as` Keyword
```rust
use std::fmt::Result;
use std::io::Result as IoResult;
```

## Re-exporting Names with `pub use`
```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

pub use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```
在 `pub use` 之前，外部代码如果想调用 `add_to_waitlist` 方法的话，就需要使用 `restaurant::front_of_house::hosting::add_to_waitlist()` 这个路径，并且还需要让 `front_of_house` 这个模块 public。现在使用了 `pub use` 后，外部代码可以直接通过 `restaurant::hosting::add_to_waitlist()` 调用。

## Using Nested Paths to Clean Up Large `use` Lists
```rust
use std::{cmp::Ordering, io};
```

## The Glob Operator
```rust
use std::collections::*;
```

# Separating Modules into Different Files
首先将 `front_of_house` 模块提取到单独的文件中。此时 src/lib.rs 就只剩：
```rust
mod front_of_house;

pub use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

然后编写 src/front_of_house.rs ：
```rust
pub mod hosting {
    pub fn add_to_waitlist() {}
}
```
编译器知道需要查找此文件，是因为在 crate root 中存在同名的模块。

请注意，只需要在模块树中使用 mod 声明加载文件一次。

然后，把 hosting 模块也单独拎出来。这里因为它是 front_of_house 的子模块，因此将其放在 src/front_of_house 目录下，并修改 src/front_of_house.rs 为：
```rust
pub mod hosting; 
```

src/front_of_houst/hosting.rs：
```rust
pub fn add_to_waitlist() {}
```
