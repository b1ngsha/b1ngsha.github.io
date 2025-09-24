---
title: The Rust Programming Language：Writing Automated Tests
date: 2025-09-24 23:35:18
tags: Rust
categories: Rust
---
# How to Write Tests
Rust 中的测试是被标记 `test` 属性的一个函数。如果要将一个普通函数变成一个测试函数，在 `fn` 前的那行添加 `#[test]`。当执行 `cargo test` 时，Rust 会构建一个二进制的测试 runner 来运行这些被标记的函数，并报告每个测试函数通过还是失败。

示例代码：
```rust
pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
```
这里的 `use super::*` 会将 `tests` 模块外部的所有代码引入。

当测试函数 panic 时，测试就会失败。每个测试都是在一个新线程中运行的，所以当主线程看到一个测试线程 died 的时候，这个测试就会被标记为失败。

## Testing Equality with the `assert_eq!` and `assert_ne!` Macros
当测试失败时，`assert!`只会展示 `failed`，但是 `assert_eq!` 会打印出真实值和预期值，但这意味着这两个被比较的值都必须实现 `PartialEq`（用于比较是否相等）和 `Debug`（用于打印值）这两个 trait。

## Adding Custom Failure Messages
```rust
#[test]
fn greeting_contains_name() {
    let result = greeting("Carol");
    assert!(
        result.contains("Carol"),
        "Greeting did not contain name, value was `{result}`"
    );
}
```

## Checking for Panics with `should_panic`
```rust
pub struct Guess {
    value: i32,
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 || value > 100 {
            panic!("Guess value must be between 1 and 100, got {value}.");
        }

        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic]
    fn greater_than_100() {
        Guess::new(200);
    }
}
```

更精确的异常判断：
```rust
// --snip--

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 {
            panic!(
                "Guess value must be greater than or equal to 1, got {value}."
            );
        } else if value > 100 {
            panic!(
                "Guess value must be less than or equal to 100, got {value}."
            );
        }

        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic(expected = "less than or equal to 100")]
    fn greater_than_100() {
        Guess::new(200);
    }
}
```

## Using `Result<T, E>` in Tests
```rust
#[test]
fn it_works() -> Result<(), String> {
    let result = add(2, 2);

    if result == 4 {
        Ok(())
    } else {
        Err(String::from("two plus two does not equal four"))
    }
}
```
这里当返回 `Err` 时就意味着测试失败了。
在这种情况下，你不能使用 `#[should_panic]`。为了断言一个操作是否返回了一个 `Err`，你应该使用 `assert!(value.is_err())`，而不是在 `Result<T, E>` 上使用三目运算符。

# Controlling How Tests Are Run
`cargo test` 会在测试模式下编译代码并运行产生的二进制文件。由 `cargo test` 生成的二进制文件的默认行为是并行运行所有测试，并捕获在运行期间生成的输出，防止输出被显示并使读取与测试结果相关的输出变得更容易。不过，你可以指定命令行选项来更改此默认行为。
一些命令行选项适用于 `cargo test`，而另一些适用于生成的测试二进制文件。为了分隔这两种类型的参数，使用 `--` 分隔符。例如 `cargo test --help` 会输出 `cargo test` 的可用参数，`cargo test -- --help` 则会显示对二进制文件的可用参数。

## Running Tests in Parallel or Consecutively
默认情况下测试是并行运行的，如果想让它们串行执行，则可以用 `--test-threads` 参数控制：
```bash
$ cargo test -- --test-threads=1
```

## Showing Function Output
正常情况下，测试中的控制台打印都会被捕获，如果测试通过，我们是看不到这些打印信息的；如果测试失败，我们才能看到这些内容。
如果我们想看到成功的单测打印的信息，可以用 `--show-output`：
```bash
$ cargo test -- --show-output
```

## Running a Subset of Tests by Name
### Running Single Tests
通过名称指定运行哪些测试：
```bash
$ cargo test one_hundred
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.69s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 1 test
test tests::one_hundred ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 2 filtered out; finished in 0.00s
```
通过名称指定只能指定一个，传递多个的话后面的值会被忽略。

### Filtering to Run Multiple Tests
我们可以指定测试名称的一部分，此时所有名称中包含这部分的测试都会运行，例如：
```bash
$ cargo test add
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.61s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 2 tests
test tests::add_three_and_two ... ok
test tests::add_two_and_two ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 1 filtered out; finished in 0.00s
```

### Ignoring Some Tests Unless Specifically Requested
有些测试比较耗时，因此我们可以在运行时先将其忽略：
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }

    #[test]
    #[ignore]
    fn expensive_test() {
        // code that takes an hour to run
    }
}
```

此时运行 `cargo test` 它就会被忽略：
```bash
$ cargo test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.60s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 2 tests
test tests::expensive_test ... ignored
test tests::it_works ... ok

test result: ok. 1 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

我们也可以只运行被忽略的测试：
```bash
$ cargo test -- --ignored
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.61s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 1 test
test tests::expensive_test ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 1 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

如果想同时运行被忽略和未被忽略的测试，则可以用 `cargo test -- --include-ignored`。

# Test Organization
## Unit Tests
单测的约定是在每个文件中创建一个名为 `tests` 的模块来包含测试函数，并用 `cfg(test)` 注解该模块。

### The Tests Module and `#[cfg(test)]`
`test` 模块上的 `#[cfg(test)]` 告诉 Rust 只当你运行 `cargo test` 才编译并运行测试代码，而不是当你运行 `cargo build` 时。

### Testing Private Functions
```rust
pub fn add_two(a: u64) -> u64 {
    internal_adder(a, 2)
}

fn internal_adder(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        let result = internal_adder(2, 2);
        assert_eq!(result, 4);
    }
}
```

## Integration Tests
在 Rust 中，集成测试对你的库来说是完全独立的。它们以与其他代码相同的方式来使用你的库，这意味着它们只能调用你库中的公共 API。它们的目的是为了测试库中的多个部分是否能够正确地协同工作。为了创建集成测试，首先需要一个测试目录。

### The `tests` Directory
在项目目录的顶层创建一个 `test` 目录，跟 `src` 同级。示例：
```bash
adder
├── Cargo.lock
├── Cargo.toml
├── src
│   └── lib.rs
└── tests
    └── integration_test.rs
```

在 `tests/integration_test.rs` 文件中：
```rust
use adder::add_two;

#[test]
fn it_adds_two() {
    let result = add_two(2);
    assert_eq!(result, 4);
}
```
`tests` 文件中的每个文件都是一个单独的 crate，所以我们需要把我们的库引入到每个 test crate 的作用域中。
我们不需要添加 `#[cfg(test)]` 注解，Cargo 会把 `tests` 目录中的内容都当作是测试，只会当在运行 `cargo test` 的时候才会编译执行：
```bash
$ cargo test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 1.31s
     Running unittests src/lib.rs (target/debug/deps/adder-1082c4b063a8fbe6)

running 1 test
test tests::internal ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/integration_test.rs (target/debug/deps/integration_test-1082c4b063a8fbe6)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
从上往下分别是：单元测试、集成测试和文档测试。如果某个部分的测试失败了，就不会继续向下运行。

我们仍然可以运行一个特定的集成测试函数，通过将函数名指定为 `cargo test` 的一个参数。要想执行某个特定的集成测试文件中所有的测试，使用 `--test` + 文件名：
```bash
$ cargo test --test integration_test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.64s
     Running tests/integration_test.rs (target/debug/deps/integration_test-82e7799c1bc62298)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
这只会执行 `tests/integration_test.rs` 文件中的所有测试。

### Submodules in Integration Tests
对于同类的集成测试，很自然地回想将它们分到同个组中。当我们想写一些在其他集成测试中使用的工具方法时，一般会将这些工具方法放到一个 common module 当中。例如，我们创建 `tests/common.rs` 并把一个叫做 `setup` 的函数放到里面：
```rust
pub fn setup() {
    // setup code specific to your library's tests would go here
}
```
当我们重新运行测试时，我们会看到一个关于 common.rs 的新的 section，即使这个文件没有包含任何测试函数，并且我们也没有在任何地方调用这个 `setup` 函数：
```bash
$ cargo test
   Compiling adder v0.1.0 (file:///projects/adder)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.89s
     Running unittests src/lib.rs (target/debug/deps/adder-92948b65e88960b4)

running 1 test
test tests::internal ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/common.rs (target/debug/deps/common-92948b65e88960b4)

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

     Running tests/integration_test.rs (target/debug/deps/integration_test-92948b65e88960b4)

running 1 test
test it_adds_two ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests adder

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

但我们只是想在其他集成测试文件中使用这个 common module 里面的方法而已。为了避免让 `common` 出现在输出里面，我们将创建 `tests/common/mod.rs` 而不是 `tests/common.rs`：
```bash
├── Cargo.lock
├── Cargo.toml
├── src
│   └── lib.rs
└── tests
    ├── common
    │   └── mod.rs
    └── integration_test.rs
```
当我们把 `setup` 函数从 `tests/common.rs` 中移到 `tests/common/mod.rs` 后，输出就消失了。
此时，我们就可以在任何集成测试文件中以一个模块的形式来使用它：
```rust
use adder::add_two;

mod common;

#[test]
fn it_adds_two() {
    common::setup();

    let result = add_two(2);
    assert_eq!(result, 4);
}
```

### Integration Tests for Binary Crate
如果我们的项目是一个仅包含 `src/main.rs` 文件的二进制 crate，并且没有 `src/lib.rs` 文件，我们就无法在 `tests` 目录中创建集成测试，并通过其他声明将 `src/main.rs` 文件中定义的函数引入作用域。只有 lib crate 提供其他 crate 可以调用的函数；二进制 crate 的设计就是要单独运行。
这也是 Rust 项目提供二进制的原因之一，它们有一个直接的 src/main.rs 文件，调用位于 src/lib.rs 文件中的逻辑。使用这种结构，集成测试可以使用库 crate 的功能来测试库。如果重要功能正常工作，src/main.rs 文件中的小量代码也会正常工作，并且这小量代码不需要被测试。