---
title: "The Rust Programming Language：Common Programming Concepts"
date: 2025-08-29T00:11:35+08:00
series: rust
part: 3
---
本章将讲述编程语言中的几乎所有基本概念，并描述它们在Rust中的工作方式。

## Variables and Mutability
正如之前的章节所说的那样，在Rust中，变量默认是不可变的。这是Rust推荐的一种做法，旨在让你以一种利用Rust提供的安全性和简便开发性的方式编写代码。
当一个变量是不可变的，并且绑定了一个值后，你就不能再改变它的值了：
```rust
fn main() {
    let x = 5;
    println!("The value of x is: {x}");
    x = 6;
    println!("The value of x is: {x}");
}
```
此时执行`cargo run`，你就会收到一个异常信息：
```shell
$ cargo run          
   Compiling variables v0.1.0 (/path/to/your/variables)
error[E0384]: cannot assign twice to immutable variable `x`
 --> src/main.rs:4:5
  |
2 |     let x = 5;
  |         - first assignment to `x`
3 |     println!("The value of x is: {x}");
4 |     x = 6;
  |     ^^^^^ cannot assign twice to immutable variable
  |
help: consider making this binding mutable
  |
2 |     let mut x = 5;
  |         +++

For more information about this error, try `rustc --explain E0384`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```
当我们尝试改变一个不可变的变量时，出现编译时错误是很重要的。如果我们的代码假设某个值永远不会被改变，但是在其他地方却改变了这个值，那么就说明代码可能脱离了原本的设计。这类错误可能很难追踪，特别是仅在某些情况下才修改变量值的时候。Rust保证当你声明了一个值不会改变时，它就一定不会被改变，这样你就不必自己去定位这类错误。

但是可变性是很有用的，像上一章中提到的那样，你可以在变量名之前添加`mut`关键字来让其可变：
```rust
fn main() {
    let mut x = 5;
    println!("The value of x is: {x}");
    x = 6;
    println!("The value of x is: {x}");
}
```
这样就可以正常修改变量值了：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/variables)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.35s
     Running `target/debug/variables`
The value of x is: 5
The value of x is: 6
```

### Constants
与不可变的变量类似，常量也是与名称绑定后就不能再被改变的值，但是它们之间还是存在一些差异的：
1. 你不能在常量上使用`mut`，它们就只能是不可变的。你需要在定义常量的时候使用`const`而不是`let`，并且**必须显式声明类型**。
2. 常量可以在任意作用域下声明，包括全局作用域。
3. 常量只能被赋值为常量表达式，不能是在运行时计算出来的结果。
一个常量声明的例子：
```rust
const THREE_HOURS_IN_SECONDS: u32 = 60 * 60 * 3;
```
Rust对于常量的命名规范一般是全大写加下划线的方式。
常量在程序运行的整个时间都是有效的，作用范围则在其被声明的作用域内。

### Shadowing
就像在第二章中提到的那样，你可以在定义完一个变量后定义一个同名的变量，这在Rust中被称为第一个变量被第二个变量所覆盖（shadowed）了。我们可以通过使用一个相同的变量名来覆盖一个变量：
```rust
fn main() {
    let x = 5;

    let x = x + 1;

    {
        let x = x * 2;
        println!("The value of x in the inner scope is: {x}");
    }

    println!("The value of x is: {x}");
}
```
在这段程序中，`x`首先被赋值为`5`。然后我们创建了一个新的变量`x`，初始化为`x + 1`也就是6。然后，在一个内部作用域中，我们再次创建了一个新的同名变量，并初始化为`x * 2`，也就是12。在这个作用域结束后，这个shadow就被销毁了，`x`的值重新变为了`6`。因此程序的输出结果为：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/variables)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.25s
     Running `target/debug/variables`
The value of x in the inner scope is: 12
The value of x is: 6
```
shadow与`mut`是不同的，在上述情况下，如果我们不使用`let`关键字来重新对`x`进行赋值的话，就会得到一个编译时错误。通过shadow这种方式，我们就可以对值进行一些转换，但在这些转换完成后变量仍然是不可变的。
另一个不同点是，因为在shadow这种方式中我们实际上是创建了一个新的变量，只是复用了相同的变量名，因此我们是可以更改变量的数据类型的。例如：
```rust
let spaces = "   ";
let spaces = spaces.len();
```
可以看到，`spaces`从字符串类型被修改为了数字类型。这说明shadow让我们可以不再定义各种像`spaces_str`，`spaces_num`这样的变量，而是可以一直使用`spaces`。然而，如果我们使用`mut`，就会得到一个编译时错误：
```rust
let mut spaces = "   ";
spaces = spaces.len();
```
报错信息显示我们不能修改一个变量的类型：
```shell
$ cargo run
   Compiling variables v0.1.0 (/path/to/your/variables)
error[E0308]: mismatched types
  --> src/main.rs:26:14
   |
25 |     let mut spaces = "   ";
   |                      ----- expected due to this value
26 |     spaces = spaces.len();
   |              ^^^^^^^^^^^^ expected `&str`, found `usize`

For more information about this error, try `rustc --explain E0308`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```

## Data Types
Rust是一种静态类型语言，这意味着它必须在编译期知道所有变量的类型。编译器通常可以根据值以及我们如何使用它来推断我们想要使用的类型。但是当很多类型都是可能的情况下，我们必须显式声明它，像这样：
```rust
let guess: u32 = "42".parse().expect("Not a number!");
```
如果没有加`: u32`这个类型注释的话，就会产生如下报错，这说明Rust需要从我们这里获取更多信息来知道我们想要使用哪种数据类型：
```shell
$ cargo build
   Compiling variables v0.1.0 (/path/to/your/variables)
error[E0284]: type annotations needed
  --> src/main.rs:30:9
   |
30 |     let guess = "42".parse().expect("Not a number!");
   |         ^^^^^        ----- type must be known at this point
   |
   = note: cannot satisfy `<_ as FromStr>::Err == _`
help: consider giving `guess` an explicit type
   |
30 |     let guess: /* Type */ = "42".parse().expect("Not a number!");
   |              ++++++++++++

For more information about this error, try `rustc --explain E0284`.
error: could not compile `variables` (bin "variables") due to 1 previous error
```

### Scalar Types
标量类型（scalar type）代表单个值。Rust有四种主要的标量类型：整数、浮点数、布尔值和字符。

#### Integer Types
| Length  | Signed  | Unsigned |
| ------- | ------- | -------- |
| 8-bit   | `i8`    | `u8`     |
| 16-bit  | `i16`   | `u16`    |
| 32-bit  | `i32`   | `u32`    |
| 64-bit  | `i64`   | `u64`    |
| 128-bit | `i128`  | `u128`   |
| arch    | `isize` | `usize`  |
其中，`isize`和`usize`类型取决于程序运行的计算机架构，如果在`64`位架构上，则为`64`位，否则为`32`位。

|Number literals|Example|
|---|---|
|Decimal|`98_222`|
|Hex|`0xff`|
|Octal|`0o77`|
|Binary|`0b1111_0000`|
|Byte (`u8` only)|`b'A'`|
可以用以上方式来声明不同进制的字面量，此外，可以在数字字面量上添加一个后缀来指定类型，例如`57u8`。也可以用`_`来划分数字使其便于阅读，例如`1_000`。
**对于`integer`而言，Rust的默认类型为`i32`**。
> Integer Overflow
> overflow是一个很经典的问题。在Rust当中，如果你在`debug`模式下编译，那么overflow会造成程序在运行时`panic`。而如果你在`release`模式下编译，则会进行`two's complement wrapping`（二的补码包装..?）简单来说，就是如果在`u8`这个类型下，256将变为0，257将变为1。
> 为了明确处理溢出的可能性，可以使用标准库为基本数字类型提供的这些方法：
> 1. 在所有模式中用`wrapping_*`方法进行包裹；
> 2. 在使用`checked_*`方法时，如果发生溢出，则返回`None`；
> 3. 使用`overflowing_*`方法返回值和一个bool来指示是否发生了溢出；
> 4. 使用`saturating_*`方法在值的最大值和最小值处饱和（saturate，也就是在超过最值时不再增加/减少，而是保持在最值）。

#### Floating-Point Types
Rust包含两种浮点数类型：`f32`和`f64`。默认类型为`f64`。
```rust
fn main() {
    let x = 2.0; // f64
    
    let y: f32 = 3.0; // f32
}
```

#### Numeric Operations
Rust支持加减乘除这些基本数学运算。整数运算会向零取整。
```rust
fn main() {
    // addition
    let sum = 5 + 10;
    
    // subtraction
    let difference = 95.5 - 4.3;
    
    // multiplication
	let product = 4 * 30;
	
	// division
	let quotient = 56.7 / 32.2;
	let truncated = -5 / 3; // Results in -1
	// remainder
	let remainder = 43 % 5;
}
```

#### The Boolean Type
Rust的布尔类型为`bool`，跟其他编程语言同样包含`true`和`false`，大小为一个字节。
```rust
fn main() {
	let t = true;
	let f: bool = false; // with explicit type annotaion
}
```

#### The Character Type
Rust的`char`类型是最原始的字符类型。
```rust
fn main() {
	let c = 'z';
	let z: char = 'ℤ'; // with explicit type annotation
	let heart_eyed_cat = '😻';
}
```
字符用的是单引号，字符串是双引号。字符类型的大小为4个字节，并表示Unicode标量值。这意味着它可以表示比ASCII更多的内容。Unicode标量值的范围从`U+0000`到`U+D7FF`，以及`U+E000`到`U+10FFFF`。然而，字符在Unicode中并不是一个真正的概念，因此我们对字符的人类直觉可能与Rust中的字符并不吻合。我们将在更后面的章节里讨论它。

### Compound Types
Rust主要有两种复合类型：元组（tuples）和数组（arrays）。

#### The Tuple Type
`tuple`是一种将一些不同类型的值组合到一起的方式。它是定长的。
一个定义`tuple`的示例：
```rust
fn main() {
	let tup: (i32, f64, u8) = (500, 6.4, 1);
}
```
和变量的定义类似，这里的类型注解是可选的，如果不写的话就会做类型推断。
如果想获取每个元素，我们可以采用`destructuring`这种方式：
```rust
fn main() {
	let tup = (500, 6.4, 1);

	let (x, y, z) = tup;

	println!("The value of y is: {y}");
}
```
更简单的方式是通过`.`+下标来取值：
```rust
fn main() {
	let x: (i32, f64, u8) = (500, 6.4, 1);

	let five_hundred = x.0;

	let six_point_four = x.1;

	let one = x.2;
}
```
没有任何值的`tuple`有一个特殊的名称，被称为`unit`（单元）。这种值及其对应的类型都写作`()`，表示一个空值或者是空返回类型。如果表达式没有返回任何值，则会隐式返回一个`unit`。

#### The Array Type
另一种方式则是`array`。不同的是，`array`当中的所有元素都应该是相同的类型。并且Rust中的`array`是定长的。
```rust
fn main() {
	let a = [1, 2, 3, 4, 5];
}
```
当你想要将数据分配到栈上，或者是想要一个固定数目的元素时，`array`是很有用的。到目前我们所看到的所有类型都是在栈上分配内存，而不是堆。
标准库中的`vector`与`array`类似，但它的长度是可伸缩的。如果你不知道是使用`array`还是`vector`，一般来说你都应该使用`vector`。
然而，如果你知道元素的数量并且不需要修改时，`array`是比`vector`更有用的。例如：
```rust
let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
```
一个显式定义`array`的元素类型和长度的例子：
```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];
```
你也可以通过指定一个初始值的方式，初始化一个所有元素都是相同的值的`array`：
```rust
let a = [3; 5];
```
这与`let a = [3, 3, 3, 3, 3]`相同。

`array`的取值方式与其他语言相同：
```rust
fn main() {
	let a = [1, 2, 3, 4, 5];

	let first = a[0];
	let second = a[1];
}
```

让我们看看如果产生了数组的越界访问会发生什么。以如下程序为例：
```rust
use std::io;

fn main() {
	let a = [1, 2, 3, 4, 5];

	println!("Please enter an array index.");

	let mut index = String::new();

	io::stdin()
		.read_line(&mut index)
		.expect("Failed to read line");

	let index: usize = index
		.trim()
		.parse()
		.expect("Index entered was not a number");

	let element = a[index];
	
	println!("The value of the element at index {index} is: {element}")
}
```
当输入的数字为10的时候，会产生如下报错：
```shell
$ cargo run  
   Compiling variables v0.1.0 (/path/to/your/variables)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.46s
     Running `target/debug/variables`
Please enter an array index.
10

thread 'main' panicked at src/main.rs:81:19:
index out of bounds: the len is 5 but the index is 10
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```
我们可以看到，与其他更贴近底层的编程语言不同，当产生数组越界时，这里直接抛出了一个运行时的异常，而不是允许程序直接访问这块未被分配的内存区域并继续执行，这体现了Rust的内存安全原则。

# Functions
Rust使用`snake case`作为变量和函数统一的命名方式，也就是平时所说的“下划线命名”。
```rust
fn main() {
	println!("Hello, world!");

	another_function();
}

fn another_function() {
	println!("Another Function").
}
```
同时可以看到，`another_function`是在`main`之后定义的，但是仍然可以在`main`中进行调用。这意味着Rust不在乎你在哪里定义函数，只要它们在调用者能够“看见”的范围内即可。

#### Parameters
```rust
fn main() {
	another_function(5);
}

fn another_function(x: i32) {
	println!("The value of x is: {x}");
}
```
在函数签名中，你必须声明每个参数的类型。这意味着编译器几乎不需要你在代码的其他地方使用它们来弄清楚你想使用什么类型，同时如果编译器知道参数期望什么类型，它也能提供更有帮助的错误信息。

你可以像这样定义多个参数：
```rust
fn main() {
	print_labeled_measurement(5, 'h');
}

fn print_labeled_measurement(value: i32, unit_label: char) {
	println!("The measurement is: {value}{unit_label}");
}
```

### Statements and Expressions
Rust是一个基于表达式的语言，这一点非常值得理解。
- 语句（Statements）是执行某些操作并且不返回值的指令。
- 表达式（Expressions）是会计算出一个结果值的。
例如，`let y = 6;`就是一个语句。函数的定义也是语句。
由于语句不返回值，因此你不能将一个`let`语句赋值给另一个变量，就像这样是会产生错误的：
```rust
fn main() {
	let x = (let y = 6);
}
```
对于表达式而言，除了常规的表达式外，一个代码块也是一个表达式，例如：
```rust
fn main() {
	let y = {
		let x = 3;
		x + 1
	};
	println!("The value of y is: {y}");
}
```
此时`y`的值为`4`。可以看到在代码块的最后一行中，`x + 1`是没有以分号结尾的，这表示它是一个表达式，否则就表示它是一个语句，语句是不会返回值的。

### Functions with Return Values
我们不需要给函数的返回值命名，但是必须通过`->`来声明它们的类型。在Rust中，函数的返回值返回值等同于函数中最后一个表达式的值。你可以通过`return`提早返回，但大部分的函数都会隐式地返回最后一个表达式。
```rust
fn five() -> i32 {
	5
}

fn main() {
	let x = five();

	println!("The value of x is: {x}");
}
```
`five`函数中的`5`就是它的返回值，类型为`i32`。

# Comments
Rust的注释方式为：`// comment`。单行和多行注释都用这种方式。对于文档注释，我们将会在后续的章节中进行讨论。

# Control Flow
## `if` Expressions
`if-else`条件分支与其他语言中类似。因此只重点看一下不同的部分。
`if`中的条件必须是一个`bool`，不能是一个值，否则会产生报错：
```rust
fn main() {
	let number = 3;

	if number {
		println!("number was three");
	}
}
```
这里不能自动将`number`转换为`bool`，需要显式地修改为`number != 0`这种方式作为判断条件。

### Using `if` in a `let` Statement
由于`if`是一个表达式，因此我们可以把它放在`let`表达式的右边，用来给一个变量赋值：
```rust
fn main() {
	let condition = true;
	let number = if condition { 5 } else { 6 };

	println!("The value of number is: {number}");
}
```
对于`if`的每个分支，它们的结果都需要是相同的类型。对于以上的示例来说，它们的类型都是`i32`。如果类型不匹配，那么就会产生报错：
```rust
fn main() {
	let condition = true;
	let number = if condition { 5 } else { "six" };

	println!("The value of number is: {number}");
}
```
因为Rust需要在编译期知道`number`这个变量的类型，这可以让编译器保证在我们使用`number`的任何地方它的类型都是有效的。而如果它在运行时确定，就无法做到这一点，因为它需要追踪多种假设的类型。

## Repetition with Loops
Rust有三种循环的方式：`loop`，`while`和`for`。

### Repeating Code with `loop`
```rust
fn main() {
	loop {
		println!("again!");
	}
}
```
这会开启一个死循环，你可以通过`ctrl + c`来中断它。与其他语言类似，你也可以通过`break / continue`来进行控制。

### Returning Values from Loops
`loop`的一个用途是用来重试可能出现失败的操作，例如检查一个线程是否完成了它的工作。你可能还需要将操作的结果传递到循环外的作用域中，以供代码的其余部分进行使用。为此，你可以使用`break`表达式停止循环并添加你想要返回的值：
```rust
fn main() {
	let mut counter = 0;

	let result = loop {
		counter += 1;

		if counter == 10 {
			break counter * 2;
		}
	};

	println!("The result is {result}");
}
```
在这个示例中，`result`会被赋值为`20`。

### Loop Labels to Disambiguate Between Multiple Loops
在多层循环嵌套的场景中，可以用`loop label`与`break/continue`结合使用的方式实现灵活的循环控制。在Rust中，循环的标签必须以单引号开头：
```rust
fn main() {
	let mut count = 0;
	'counting_up: loop {
		println!("count = {count}");
		let mut remaining = 10;

		loop {
			println!("remaining = {remaining}");
			if remaining == 9 {
				break;
			}
			if count == 2 {
				break 'counting_up;
			}
			remaining -= 1;
		}

		count += 1;
	}
	println!("End count = {count}");
}
```
在这里给外层的循环标记了标签为`'counting_up`，在内层需要退出外层循环时就可以直接`break 'counting_up`。

### Conditional Loops with `while`
`loop`需要用`break`才能退出循环，而`while`则可以直接适配条件判断，与其他语言中的`while`相同：
```rust
fn main() {
	let mut number = 3;

	while number != 0 {
		println!("{number}!");
		
		number -= 1;
	}

	println!("LIFTOFF!!!");
}
```

### Looping Through a Collection with `for`
当你要遍历一个集合时，`while`可以做到，但是它更容易产生数组越界等错误。`for`是一种更安全且更优雅的遍历方式：
```rust
fn main() {
	let a = [10, 20, 30, 40, 50];

	for element in a {
		println!("the value is: {element}");
	}
}
```
另一个反向遍历集合子集的例子：
```rust
fn main() {
	for number in (1..4).rev() {
		println!("{number}!");
	}
	println!("LIFTOFF!!!");
}
```

# Summary
在本篇中，我们快速过了一遍Rust中的一些基础内容，包括变量定义、条件语句、循环语句等等。在下一章我们将开始学习Rust中的一种特性——“所有权”。