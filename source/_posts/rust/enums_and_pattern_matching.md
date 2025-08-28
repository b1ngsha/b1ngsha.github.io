---
title: The Rust Programming Language：Enums and Pattern Matching
date: 2025-08-29 00:15:00
tags: Rust
categories: Rust
---
# Defining an Enum
定义一个枚举：
```rust
enum IpAddrKind {
    V4,
    V6,
}
```

## Enum Values
可以这样使用枚举值：
```rust
let four = IpAddrKind::V4;
let six = IpAddrKind::V6;
```

这里我们只保存了IP 的类型，没有保存具体的 IP 地址。我们可以用刚学的结构体来实现：
```rust
enum IpAddrKind {
    V4,
    V6,
}

struct IpAddr {
    kind: IpAddrKind,
    address: String,
}

let home = IpAddr {
    kind: IpAddrKind::V4,
    address: String::from("127.0.0.1"),
};

let loopback = IpAddr {
    kind: IpAddrKind::V6,
    address: String::from("::1"),
};
```

但实际上，我们可以直接把数据存储到每个枚举值当中：
```rust
enum IpAddr {
    V4(String),
    V6(String),
}

let home = IpAddr::V4(String::from("127.0.0.1"));

let loopback = IpAddr::V6(String::from("::1"));
```
这里可以看到，对于每个枚举值而言，我们相当于也自动地得到了它们的构造函数。

使用枚举而不是结构体的另一个好处是：每个枚举值的关联数据可以有不同的数量和类型。
```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

let home = IpAddr::V4(127, 0, 0, 1);

let loopback = IpAddr::V6(String::from("::1"));
```

就像我们可以在结构体上定义方法一样，我们也可以在枚举上定义方法：
```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

impl Message {
    fn call(&self) {
        // ...
    }
}

let m = Message::Write(String::from("hello"));
m.call();
```

## The `Option` Enum and Its Advantages Over Null Values
这是另一个在标准库中定义的枚举（上面提到的`IpAddr`其实在标准库已经有定义）。
**Rust没有空值**，但它有一个可以编码值存在或不存在概念的枚举。这个枚举就是`Option<T>`，它由标准库定义如下：
```rust
enum Option<T> {
    None,
    Some(T),
}
```
它会自动被预加载，不需要显式引入。
这里的 `<T>` 表示泛型。

一些 `Option` 的使用示例：
```rust
let some_number = Some(5);
let some_char = Some('e');
let absent_number: Option<i32> = None;
```

但是当我们有一个`None`值时，它和空值的语义是相同的，那为什么说`Option<T>`是比 null 更好的呢？
简单来说，因为`Option<T>`和`T`是不同的类型，如果我们有一个确定的有效值时，编译器就不会允许我们使用`Option<T>`。例如以下的代码就是不能成功编译的：
```rust
let x: i8 = 5;
let y: Option<i8> = Some(5);

let sum = x + y;
```
换句话说，你必须在做`T`的操作之前把`Option<T>`转换为`T`。编译器会确保我们在使用这个值之前处理为空的情况。

# The `match` Control Flow Construct
示例：
```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

如果在某个 case 中需要运行多行代码，则需要用大括号，此时分割的逗号是可选的，例如：
```rust
fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky Penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}
```

### Patterns That Bind to Values
另一个有用的特性是，match arms 可以绑定 pattern 的部分值。例如：
```rust
#[derive(Debug)]
enum UsState {
    Alibama,
    Alaska,
    // ...
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("State quarter from {state:?}!");
            25
        }
    }
}
```
如果调用`value_in_cents(Coin::Quarter(UsState::Alaska))`，那么`coin`的值就是`Coin::Quarter(UsState::Alaska)`，`state`的值就是`UsState::Alaska`。

### Matching with `Option<T>`
```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}

let five = Some(5);
let six = plus_one(five);
let none = plus_one(None);
```

### Matches Are Exhaustive
`match`中的 arms' patterns 必须 cover 所有情，以下代码无法编译通过：
```rust
fn plus_one(x: Option<i32>) -> Option<i32> {
    match x {
        Some(i) => Some(i + 1),
    }
}
```
因为我们没有处理`None`的case。

### Catch-All Patterns and the `_` Placeholder
```rust
let dict_roll = 9;
match dict_roll {
    3 => add_fancy_hat(),
    7 => remove_fancy_hat(),
    other => move_player(other), // or
    // _ => reroll(), // or
    // _ => (),
}
```
`other` catch 了所有的其余情况。

## Concise Control Flow with `if let` and `let else`
```rust
let config_max = Some(3u8);
if let Some(max) = config_max {
    println!("The maximum is configured to be {max}");
}
```
比起`match`，`if let`简便了很多，但也失去了`match`对所有情况的检查机制。

`if let` 可以和 `let` 一起用：
```rust
let mut count = 0;
if let Coin::Quarter(state) = coin {
    println!("State quarter from {state:?}!");
} else {
    count += 1;
}
```

### Staying on the "Happy Path" with `let...else`
```rust
fn describe_state_quarter(coin: Coin) -> Option<String> {
    let Coin::Quarter(state) = coin else {
        return None;
    };

    // ...
}
```
`else` arm 中必须从这个函数 return