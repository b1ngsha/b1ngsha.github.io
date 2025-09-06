---
title: The Rust Programming Language：Common Collections
date: 2025-09-06 19:09:31
tags: Rust
categories: Rust
---

# Storing Lists of Values with Vectors
## Creating a New Vector
```rust
let v: Vec<i32> = Vec::new();
```
这里需要显式写出元素类型，因为里面还没有元素以供类型推断。
```rust
let v = vec![1, 2, 3];
```
这里的整数类型是`i32`因为它是默认类型。

## Updating a Vector
```rust
let mut v = Vec::new();

v.push(5);
v.push(6);
v.push(7);
v.push(8);
```

## Reading Elements of Vectors
```rust
let v = vec![1, 2, 3, 4, 5];

let third: &i32 = &v[2];
println!("The third element is {third}");

let third: Option<&i32> = v.get(2);
match third {
    Some(third) => println!("The third element is {third}"),
    None => println!("There is no third element."),
}
```

以下代码无法编译通过：
```rust
let mut v = vec![1, 2, 3, 4, 5];
let first = &v[0];
v.push(6);
println!("The first element is: {first}");
```
运行结果为：
```bash
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
error[E0502]: cannot borrow `v` as mutable because it is also borrowed as immutable
 --> src/main.rs:6:5
  |
4 |     let first = &v[0];
  |                  - immutable borrow occurs here
5 |
6 |     v.push(6);
  |     ^^^^^^^^^ mutable borrow occurs here
7 |
8 |     println!("The first element is: {first}");
  |                                     ------- immutable borrow later used here

For more information about this error, try `rustc --explain E0502`.
error: could not compile `collections` (bin "collections") due to 1 previous error
```
因为 push 可能发生内存拷贝，在内存不够的情况下，会销毁掉原来的内存空间并将 vector 中的内容复制到一块新的空间中。因此 first 就可能会指向一块被销毁掉的内存。Borrowing rules 会阻止程序发生这种情况。

## Iterating Over the Values in a Vector
```rust
let v = vec![100, 32, 57];
for i in &v {
    println!("{i}");
}

let mut v = vec![100, 32, 57];
for i in &mut v {
    *i += 50;
}
```

## Using an Enum to Store Multiple Types
```rust
enum SpreadsheetCell {
    Int(i32),
    Float(f64),
    Text(String),
}

let row = vec![
    SpreadsheetCell::Int(3),
    SpreadsheetCell::Text(String::from("blue")),
    SpreadsheetCell::Float(10.12),
]
```

## Dropping a Vector Drops Its Elements
```rust
{
    let v = vec![1, 2, 3, 4];
    
    // do stuff with v
} // <- v goes out of scope and is freed here
```

# Storing UTF-8 Encoded Text with Strings
## What Is a String?
Rust 在核心语言中只有一种字符串类型，即字符串切片 str，通常以借用形式 &str 出现。`String`类型，是在Rust 的标准库中提供的，而不是被编码在核心语言中。它是可增长的、可变的、独占的、UTF-8 编码的字符串类型。

## Creating a New String
```rust
// create a new, empty string
let mut s = String::new();

// initial string data
let data = "initial contents";
let s = data.to_string();
let s = "initial contents".to_string();

// equal to use to_string
let s = String::from("initial contents");
```

## Updating a String
可以方便地用 `+` 操作符和 `format!` 宏来拼接字符串。

### Appending to a String with `push_str` and `push`
```rust
let mut s = String::from("foo");
s.push_str("bar");
```
`push_str` 方法接受一个字符串切片，因为我们不一定想要对参数进行所有权转移。例如下面这个场景：
```rust
let mut s1 = String::from("foo");
let s2 = "bar";
s1.push_str(s2);
println!("s2 is {s2}");
```
如果 `push_str` 抢占了 `s2` 的所有权，我们就不能在最后一行打印它的值了，这显然不是我们想要的。

`push`方法接收一个字符作为参数并将其加入到`String`中：
```rust
let mut s = String::from("lo");
s.push('l');
```

### Concatenation with the `+` Operator or the `format!` Macro
```rust
let s1 = String::from("Hello, ");
let s2 = String::from("world!");
let s3 = s1 + &s2; // s1 has been moved here and can no longer be used
```
这里其实调用的是 add 方法，这个方法接收了一个引用类型，所以这里用了 &s2。这个 add 方法是个泛型方法，对于 String 类型来说大概长这样：
```rust
fn add(self, s: &str) -> String {
```
但是这里 add 方法参数中的 s 是&str类型，我们传的是 &String 类型，那为什么可以编译成功呢？因为编译器会将 &String 参数强制转换为 &str，调用add 方法时，Rust 使用解引用强制类型转换，将 &s2 转换为了&s2\[...\]。

在复杂的字符串拼接场景下，我们可以使用`format!`宏：
```rust
let s1 = String::from("tic");
let s2 = String::from("tac");
let s3 = String::from("toe");

let s = format!("{s1}-{s2}-{s3}");
```
它返回一个 `String`，并且它的参数使用引用，因此不会抢占所有权。

## Indexing into Strings
```rust
let s1 = String::from("hi");
let h = s1[0];
```
这段代码不能编译通过：
```rust
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
error[E0277]: the type `str` cannot be indexed by `{integer}`
 --> src/main.rs:3:16
  |
3 |     let h = s1[0];
  |                ^ string indices are ranges of `usize`
  |
  = note: you can use `.chars().nth()` or `.bytes().nth()`
          for more information, see chapter 8 in The Book: <https://doc.rust-lang.org/book/ch08-02-strings.html#indexing-into-strings>
  = help: the trait `SliceIndex<str>` is not implemented for `{integer}`
          but trait `SliceIndex<[_]>` is implemented for `usize`
  = help: for that trait implementation, expected `[_]`, found `str`
  = note: required for `String` to implement `Index<{integer}>`

For more information about this error, try `rustc --explain E0277`.
error: could not compile `collections` (bin "collections") due to 1 previous error
```
Rust 中的字符串不支持索引。但是为什么？为了回答这个问题，我们就需要讨论 Rust 在内存中是如何存储字符串的。

### Internal Representation
一个字符串是对 `Vec<u8>` 的包装。一些正确编码的 UTF-8 的字符串：
```rust
let hello = String::from("Hola");
```
这里的`len`是 4，意味着存储字符串 `Hola` 的 vector 长度为 4 字节。这里面的每个字符在用 UTF-8 编码时都占用一个字节。
但下面这一行在 Rust 中的长度为 24 个字节：
```rust
let hello = String::from("Здравствуйте");
```
因为该字符串中的每个 Unicode 标量值都需要 2 个字节来进行存储。因此，对字符串字节的索引并不总是与有效的 Unicode 标量值相关。例如：
```rust
let hello = "Здравствуйте";
let answer = &hello[0];
```
当首字母 3 被编码为 UTF-8 时，3 的第一个 byte 是 208，第二个是 151，因此实际上返回值应该是 208，但 208 本身并不是一个有效的字符。并且，返回 208 并不是用户想要的，虽然这就是在字节索引 0 处拥有的唯一数据。
因此，为了避免返回意外值并导致可能不会立即发现的错误，Rust 根本不编译此代码，从而在开发过程中尽早防止误解。

### Bytes and Scalar Values and Grapheme Clusters! Oh My!
关于 UTF-8 的另一个要点是，从 Rust 的角度看，对于字符串实际上有三种相关的观察方式：作为字节、Unicode标量值和字形集。如果我们看一下印地语单词“नमस्ते”，它存储为一个 u8值的向量，看起来就会像这样：
```rust
[224, 164, 168, 224, 164, 174, 224, 164, 184, 224, 165, 141, 224, 164, 164,
224, 165, 135]
```
这里的 18 个字节就是计算机最终存储数据的形态。如果我们把它们看成Unicode标量值，也就是 Rust 的 char 类型的话，这些字节看起来是这样的：
```rust
['न', 'म', 'स', '्', 'त', 'े']
```
这里有六个字符值，但第四个和第六个不是字母：它们是单独没有意义的变音符号。最后，如果我们将它们视为字形集，我们就得到口语化的构成印地语单词的四个字母：
```rust
["न", "म", "स्", "ते"]
```
Rust 提供了不同的方式来解释计算机存储的原始字符串数据，以便每个程序可以选择它所需的解释，无论数据使用哪种语言。
Rust 不允许我们通过索引访问字符串以获取字符的最终原因是，索引操作被期望始终具有恒定的时间复杂度（O(1)）。但是，对于字符串来说，无法保证这种性能，因为 Rust 必须从头开始遍历内容到达索引，以确定有多少个有效字符。

## Slicing Strings
对字符串进行索引通常是一个坏主意，因为不清楚字符串索引操作的返回类型应该是什么：一个字符值、一个字符、一个字形集还是一个字符串切片。因此如果你真的需要使用索引来创建字符串切片，Rust 要求你更加具体：
```rust
let hello = "Здравствуйте";

let s = &hello[0..4];
```

如果我们尝试用类似 `&hello[0..1]` 的方式来切片字符的字节的一部分，Rust 会在运行时 panic，就像访问了向量中的无效索引一样：
```rust
$ cargo run
   Compiling collections v0.1.0 (file:///projects/collections)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.43s
     Running `target/debug/collections`

thread 'main' panicked at src/main.rs:4:19:
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2) of `Здравствуйте`
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

## Methods for Iterating Over Strings
操作字符串片段的最佳方式是明确你想要字符还是字节。对于单个 Unicode 标量值，使用 chars 方法。调用"Зд"的chars会分离并返回两个类型为char的值，你可以遍历结果以访问每个元素：
```rust
for c in "Зд".chars() {
    println!("{c}");
}
```
输出：
```bash
З
д
```

类似地，`bytes` 方法返回每个字节：
```rust
for b in "Зд".bytes() {
    println!("{b}");
}
```
输出：
```bash
208
151
208
180
```

# Storing Keys with Associated Values in Hash Maps
## Creating a New Hash Map
```rust
use std::collections::HashMap;

let mut scores = HashMap::new();

scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Yellow"), 50);
```

## Accessing Values in a Hash Map
```rust
use std::collections::HashMap;

let mut scores = HashMap::new();

scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Yellow"), 50);

let team_name = String::from("Blue");
let score = scores.get(&team_name).copied().unwrap_or(0);
```
这里通过调用`copied`来处理`Option`以获得`Option<i32>`而不是`Option<&i32>`，然后调用`unwrap_or`用来将`score`设置为 0 如果`scores`中不存在这个键值对。

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();

scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Yellow"), 50);

for (key, value) in &scores {
    println!("{key}: {value}");
}
```

## Hash Maps and Ownership
对于 i32 这种实现了 `Copy` 特性的类型，值会被复制到 hash map 中。但对于独占类型，例如`String`，值就会被移动到 hash map 中，hash map 会变成这些值的 owner：
```rust
use std::collections::HashMap;

let field_name = String::from("Favorite color");
let field_value = String::from("Blue");

let mut map = HashMap::new();
map.insert(field_name, field_value);
// field_name and field_value are invalid at this point, try using them and
// see what compiler error you get!
```

## Updating a Hash Map
### Overwriting a Value
```rust
use std::collections::HashMap;

let mut scores = HashMap::new();

scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Blue"), 25);

println!("{scores:?}");
```
输出 `{"Blue": 25}`

### Adding a Key and Value Only If a Key Isn't Present
```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);

scores.entry(String::from("Yellow")).or_insert(50);
scores.entry(String::from("Blue")).or_insert(50);

println!("{scores:?}");
```

### Updating a Value Based on the Old Value
```rust
use std::collections::HashMap;

let text = "hello world wonderful world";

let mut map = HashMap::new();

for word in text.split_whitespace() {
    let count = map.entry(word).or_insert(0);
    *count += 1;
}

println!("{map:?}")
```