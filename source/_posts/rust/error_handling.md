---
title: The Rust Programming Language：Error Handling
date: 2025-09-07 11:24:11
tags: Rust
categories: Rust
---
Rust 没有异常。相反，它具有可恢复错误的类型 `Result<T, E>` 和在程序遇到不可恢复错误时停止执行的 `panic!` 宏。

# Unrecoverable Errors with `panic!`
有两种可以触发 panic 的方式：做能让代码触发 panic 的动作（例如数组越界）或显式地调用`panic!`宏。默认地，这些 panic 会打印错误信息，清理栈，然后退出。通过环境变量，你可以让 Rust 在 panic 的时候显示调用栈信息便于调试。
> Unwinding the Stack or Aborting in Response to a Panic
> 默认情况下，当发生崩溃时，程序会开始展开，这意味着Rust会沿着栈往回走，并清理它遇到的每个函数中的数据。然而，往回走并清理是非常繁琐的工作。因此，Rust允许你选择立即中止的替代方案，这将结束程序而不进行清理。
> 程序使用的内存将需要由操作系统来清理。如果在你的项目中你需要使生成的二进制文件尽可能小，你可以通过在Cargo.toml文件中适当的[profile]部分添加panic = 'abort'来从展开切换到在崩溃时中止。例如，如果你想在release下崩溃时中止，则添加以下内容：
```toml 
[profile.release]
panic = 'abort'
```

尝试在程序中调用`panic!`：
```rust
fn main() {
    panic!("crash and burn");
}
```
当运行程序时，你可以看到：
```bash
$ cargo run
   Compiling panic v0.1.0 (file:///projects/panic)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.25s
     Running `target/debug/panic`

thread 'main' panicked at src/main.rs:2:5:
crash and burn
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

另一个 case：
```rust
fn main() {
    let v = vec![1, 2, 3];

    v[99];
}
```
运行则会报错：
```bash
$ cargo run
   Compiling panic v0.1.0 (file:///projects/panic)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.27s
     Running `target/debug/panic`

thread 'main' panicked at src/main.rs:4:6:
index out of bounds: the len is 3 but the index is 99
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

如果设置 `RUST_BACKTRACE=1`：
```bash
$ RUST_BACKTRACE=1 cargo run
thread 'main' panicked at src/main.rs:4:6:
index out of bounds: the len is 3 but the index is 99
stack backtrace:
   0: rust_begin_unwind
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/std/src/panicking.rs:692:5
   1: core::panicking::panic_fmt
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/core/src/panicking.rs:75:14
   2: core::panicking::panic_bounds_check
             at /rustc/4d91de4e48198da2e33413efdcd9cd2cc0c46688/library/core/src/panicking.rs:273:5
   3: <usize as core::slice::index::SliceIndex<[T]>>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/slice/index.rs:274:10
   4: core::slice::index::<impl core::ops::index::Index<I> for [T]>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/slice/index.rs:16:9
   5: <alloc::vec::Vec<T,A> as core::ops::index::Index<I>>::index
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/alloc/src/vec/mod.rs:3361:9
   6: panic::main
             at ./src/main.rs:4:6
   7: core::ops::function::FnOnce::call_once
             at file:///home/.rustup/toolchains/1.85/lib/rustlib/src/rust/library/core/src/ops/function.rs:250:5
note: Some details are omitted, run with `RUST_BACKTRACE=full` for a verbose backtrace.
```

# Recoverable Errors with `Result`
`Result` 枚举定义了两个枚举值：
```rust
enum Result<T, E> {
	Ok(T),
	Err(E),
}
```

调用一个返回`Result`值的函数，因为这个函数可能会失败：
```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");
}
```

用 `match` 来处理 `Result`：
```rust
use std::fs::File;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file) => file,
        Err(error) => panic!("Problem opening the file: {error:?}"),
    };
}
```

## Matching on Different Errors
对于不同的错误进行不同的处理：
```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let greeting_file_result = File::open("hello.txt");

    let greeting_file = match greeting_file_result {
        Ok(file) => file,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(fc) => fc,
                Err(e) => panic!("Problem creating the file: {e:?}"),
            },
            _ => {
                panic!("Problem opening the file: {error:?}");
            }
        },
    };
}
```

> Alternatives to Using `match` with `Result<T, E>`
> 可以看到，每次都要用一大堆 `match` 来匹配每个 case。可以用闭包和`unwrap_or_else`函数结合的方式来更简易地实现：
```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let greeting_file = File::open("hello.txt").unwrap_or_else(|error| {
        if error.kind() == ErrorKind::NotFound {
            File::create("hello.txt").unwrap_or_else(|error| {
                panic!("Problem creating the file: {error:?}");
            })
        } else {
            panic!("Problem opening the file: {error:?}");
        }
    });
}
```

### Shortcuts for Panic on Error: `unwrap` and `expect`
`match` 太冗长了，可以用快捷方法`wrap`，如果`Result`是`Ok`，那么它会返回`Ok`中包含的值；否则会为我们调用`panic!`宏：
```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt").unwrap();
}
```
如果不存在这个文件，则会 panic：
```rust
thread 'main' panicked at src/main.rs:4:49:
called `Result::unwrap()` on an `Err` value: Os { code: 2, kind: NotFound, message: "No such file or directory" }
```

类似地，`expect`方法也能让我们自定义`panic!`的错误信息：
```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt")
        .expect("hello.txt should be included in this project");
}
```

> `unwrap` 和 `expect` 的区别其实就是 `expect` 可以自定义 panic 信息、

此时的报错信息为：
```bash
thread 'main' panicked at src/main.rs:5:10:
hello.txt should be included in this project: Os { code: 2, kind: NotFound, message: "No such file or directory" }
```

## Propagating Errors
```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let username_file_result = File::open("hello.txt");

    let mut username_file = match username_file_result {
        Ok(file) => file,
        Err(e) => return Err(e),
    };

    let mut username = String::new();

    match username_file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}
```

### A Shortcut for Propagating Errors: The `?` Operator
```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username_file = File::open("hello.txt")?;
    let mut username = String::new();
    username_file.read_to_string(&mut username)?;
    Ok(username)
}
```
`Err` 会提前 return。

与 `match` 不同的是：对于 err 的情况会调用在 `From` 特性上定义的 `from` 方法，这会将值从一个类型转换到另一个类型。当 `?` 操作符调用了 `from` 函数，那么它就会将接收到的错误类型转换为方法中需要返回的错误类型。

还可以写得更简单：
```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut username = String::new();

    File::open("hello.txt")?.read_to_string(&mut username)?;

    Ok(username)
}
```

还能再简化：
```rust
use std::fs;
use std::io;

fn read_username_from_file() -> Result<String, io::Error> {
    fs::read_to_string("hello.txt")
}
```

### Where the `?` Operator Can Be Used
如果我们在 `main` 函数中使用 `?` 操作符：
```rust
use std::fs::File;

fn main() {
    let greeting_file = File::open("hello.txt")?;
}
```
这里就不合适了，因为 `?` 会返回一个 `Result` ，而 `main` 的返回值类型是 `()`，报错信息：
```bash
$ cargo run
   Compiling error-handling v0.1.0 (file:///projects/error-handling)
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option` (or another type that implements `FromResidual`)
 --> src/main.rs:4:48
  |
3 | fn main() {
  | --------- this function should return `Result` or `Option` to accept `?`
4 |     let greeting_file = File::open("hello.txt")?;
  |                                                ^ cannot use the `?` operator in a function that returns `()`
  |
  = help: the trait `FromResidual<Result<Infallible, std::io::Error>>` is not implemented for `()`
help: consider adding return type
  |
3 ~ fn main() -> Result<(), Box<dyn std::error::Error>> {
4 |     let greeting_file = File::open("hello.txt")?;
5 +     Ok(())
  |

For more information about this error, try `rustc --explain E0277`.
error: could not compile `error-handling` (bin "error-handling") due to 1 previous error
```

错误信息中提到 `?` 也可以被用于 `Option<T>`。跟在`Result`上使用 `?` 一样，你也只能在返回 `Option` 的方法中使用 `?`。它们的行为也是类似的，如果值是 `None` 那么就会提前返回 `None`，例如：
```rust
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}
```
但是你不能混合使用 `?` ，不能同时返回 `Option` 和 `Result`。

`main` 函数其实也可以返回 `Result<(), E>`，因此我们可以把上述代码修改为：
```rust
use std::error::Error;
use std::fs::File;

fn main() -> Result<(), Box<dyn Error>> {
    let greeting_file = File::open("hello.txt")?;

    Ok(())
}
```
`Box<dyn Error>` 是一个 trait object，这会在后面讲到。目前你可以认为 `Box<dyn Error>` 意味着任何类型的错误。