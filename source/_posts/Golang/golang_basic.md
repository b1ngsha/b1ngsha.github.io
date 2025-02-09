---
title: 走进golang
date: 2024-11-17 15:59:18
tags: Golang
category: Golang
---

Golang基础学习笔记，部分来自[刘丹冰老师课程](https://www.bilibili.com/video/BV1gf4y1r79E/?p=52&spm_id_from=333.1007.top_right_bar_window_history.content.click&vd_source=d3889d018fe0deefd57035d350db0a6c)中学习到的内容

<!-- more -->

## 目录结构

`golang/src/project01/main`
- golang：设置的`GOPATH`路径
- src：存放项目源代码
- project01：项目根路径
- main：模块（包）名

## Hello World

```go
package main // 声明文件所在在包，每个文件必须有归属的包

import "fmt"

func main() {
    fmt.Println("Hello Golang!")
}
```

手动编译后运行（会生成`.exe`文件）：
```bash
go build test.go
./test.exe
```

直接编译运行（不生成`.exe`文件）：
```bash
go run test.go
```

以上两种方式的区别：
- 在编译（`go build`）时，编译器会**将程序运行依赖的库文件包含在可执行文件中**，所以，可执行文件变大了很多
- 如果我们先编译生成了可执行文件，那么我们可以将该可执行文件拷贝到没有go开发环境的机器上，仍然可以运行
- 如果我们是直接`go run`，那么就需要go的开发环境才能执行


## 包

- `import`的实际上是包的路径，基于`$GOPATH/src/`为根目录，使用的时候采用`包名.函数名`的方式进行调用
- 在一个目录下的文件**必须归属于同一个包**
- 可以给包取别名，取别名后，原来的包名就不能使用了
```go
import format "fmt"
	
	
fmt.Println() // Error
```


## 变量

```go
var age int
age = 18

var age2 int = 18

age2 := 18
```

- 如果没有赋值， 就会使用默认值（零值）
- 如果没有写变量的类型， 那么会根据等号后的值进行自动类型推断（例如`var age = 18`）

```go
// 定义多个变量
var i, j, k int 

var age, name, height = 18, "jack", 178

year, month := 2024, 10
```

```go
// 定义全局变量
var age, name = 18, "jack"

var (
    age = 18
    name = "jack"
)
```

## 数据类型

- 整数类型：int、int8、int16、int32、int64、uint、uint8、uint16、uint32、uint64、byte。默认为int类型，数字代表比特位数
	- int/uint的大小和操作系统位数有关，在32位的系统下为4字节，在64位的系统下为8字节
	- rune等价于int32，byte等价于uint8
- 浮点类型：float32、float64。默认为float64类型
- 字符类型：Golang中没有专门的字符类型，如果要存储单个字符的话，一般用byte来保存
> [详解 Go 中的 rune 类型](https://www.cnblogs.com/cheyunhua/p/16007219.html)
- 布尔类型：bool
- 字符串类型：string。字符串是不可变的。可以用反引号定义多行字符串。
```go
var s string = "abc" + "abc" + "abc" + "abc" + "abc" + "abc" + "abc" + "abc"

// 如果要分为多行的话，要保证操作符在末尾，因为go会自动在每行的末尾加上分号，如果放在每行开头则会报错
var s string = "abc" + "abc" + "abc" + 
"abc" + "abc" + "abc" + "abc" + "abc"
```
- 指针：`*数据类型`，例如`*int、*float32`
### 类型转换

Go在不同类型的变量之间赋值时**需要显式转换**，并且**只有强制类型转换，不存在隐式转换**

```go
var num int64 = 12
var overflow int8 = int8(num) + 127 // 编译通过，但是结果发生溢出
var fail int8 = int8(num) + 128 // 编译无法通过，因为128已经超出int8的数据范围
```

将基本数据类型转为string类型：
- `fmt.Sprintf()`
- `strconv.FormatXxx()`

将string类型转为基本数据类型：
- `strconv.ParseXxx()`

## 标识符

下划线`_`本身在Go中是一个特殊的标识符，称为空标识符。可以代表任何其它的标识符，但是它对应的值会被忽略，所以仅能被作为占位符使用。
```go
import (
    "fmt"
    _"strconv" // 此时会忽略导入strconv
)

num, _ = strconv.ParseInt(str, 10, 64)
```

起名规则：
1. 尽量保持`package`的名字和目录保持一致
	> main包是程序的入口包，所以要将main函数所在的包定义为main包，如果不这样做，就无法通过`go run`运行，也无法通过`go build`得到可执行文件
	> 
	> 注意：包名是从`$GOPATH/src/`后开始计算的
2. 变量名、函数名、常量名都采用驼峰命名
3. 如果变量名、函数名、常量名首字母大写，则可以被其它的包访问；否则只能在本包中使用

## 运算符

在go语言中，`++`，`--`操作非常简单，只能单独使用，不能参与到运算当中去。并且**只能在变量的后面，不能写在变量的前面**

> 获取用户终端输入
```go
 // Scanln
var age int
fmt.Scanln(&age)

var name string
fmt.Scanln(&name)

var score float64
fmt.Scanln(&score)

var isVip bool
fmt.Scanln(&isVip)

// Scanf
fmt.Scanf("%d %s %f %t", &age, &name, &score, &isVip)
```

对于`/`，在go语言中是整数除法，如果要做小数除法的话需要进行类型转换

## 流程控制
### 分支
在go语言中，**`if`后的`{}`一定不能省略**，并且在`if`后面可以并列地加入变量的定义

```go
if count := 20; count < 30 {
    fmt.Println("count is less then 30")
}
```

注意`if-else`的格式规范：
```go
// 正确示范
if expression {
    // ...
} else {
    // ...
}

// 错误示范
if expression {
    // ...
}
else {
    // ...
}
```

`switch`注意事项：
- `switch`后是一个表达式
- `case`后面的表达式如果是常量值，则要求不能重复
- `case`后各个值的数据类型，必须和`switch`的表达式数据类型一致
- `case`后可以带多个值，使用逗号间隔，例如`case value1, value2, value3..`
- `case`后不需要break
- `default`语句不是必须的，位置也是随意的
- `switch`后也可以不带表达式，当作`if`分支来使用
- `switch`后也可以直接声明/定义一个变量，以分号结束
```go
switch variable := 18; {
    // ...
}
```
- 可以使用`fallthrough`进行`switch`穿透，直接执行下一个`case`（不再检查这个`case`是否满足，直接执行）
```go
switch count {
    case 1:
        fmt.Println("something...")
        fallthrough
    case 2:
        fmt.Println("something others...")
}
```

### 循环
循环结构只有`for`，没有`while`

```go
for i := 0; i < 10; i++ {
    // ...
}

for index, value := range str {
    // ...
}
```

需要注意的是，**`for`循环是按照字节进行遍历输出的**，而对于中文的情况，每个字符占用三个字节，需要进行额外考虑

使用`break + label`跳出指定循环：
```go
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i == 0 && j == 0 {
            break outer
        } 
    }
}
```
同理，还有`continue + label`的用法

## 函数

```go
func 函数名(形参列表) (返回值类型列表) {
    // ...
    return rets
}
```

- 基本数据类型和数组默认都是**值传递**的
- go语言中的**函数不支持重载**
- 支持可变参数，并且在处理可变参数的时候，将可变参数当作切片来处理
```go
func test(args...int) {
    for index, value := range args {
        // ...
    }
}
```
- 以值传递方式传递的变量类型，如果希望在函数内的变量能修改函数外的变量，可以传入变量的地址，在函数内以指针的形式操作变量
- 在go中，函数也是一种数据类型，可以赋值给一个变量，则该变量就是一个函数类型的变量了。通过该变量可以进行函数调用
- go语言支持自定义数据类型，例如：`type myInt int`，可以理解为起了一个别名，但是在使用的时候，例如将一个`int`类型的值赋值给一个`myInt`类型的值，编译器还是会认为这是两种不同的数据类型，需要进行强制类型转换
- 可以支持对返回值进行命名
```go
func cal(num1 int, num2 int) (sum int, sub int) {
    sub := num1 - num2
    sum := num1 + num2
    return
}
```


### init函数
- `init`函数：初始化函数，可以用来进行一些初始化的操作。每个源文件都可以包含一个init函数，该函数会在`main`函数执行前被调用
- 全局变量定义，`init`函数，`main`函数的执行流程：全局变量定义 -> `init`函数 -> `main`函数。如果存在互相引用的多个源文件，则执行顺序为：
	![全局变量定义，init函数，main函数的执行流程](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20241102164427.png)

### 匿名函数
```go
sub := func (num1 int, num2 int) int {
    return num1 - num2
}
result := sub(10, 20)
```

### 闭包
闭包就是一个函数和与其相关的引用环境组成的一个整体
```go
package main


import "fmt"


func getSum() func (int) int {
    sum := 0
    return func (num int) int {
        sum += num
        return sum
    }
}

func main() {
    f := getSum()
    fmt.Println(f(1)) // 1
    fmt.Println(f(2)) // 3
    fmt.Println(f(3)) // 6
}
```
需要注意，闭包中使用的变量/参数会一直保存在内存中，所以不可滥用

### defer
当遇到`defer`关键字，会将后面的代码**压入栈中**，也会将相关的值同时拷贝入栈中，不会随着函数后面的变化而变化
```go
func add(num1 int, num2 int) int {
    defer fmt.Println("num1 =", num1)
    defer fmt.Println("num2 =", num2)
    num1 += 90
    num2 += 50
    sum := num1 + num2
    fmt.Println("sum =", sum)
    return sum
}

// Output:
// sum = 230
// num2 = 60
// num1 = 30
```
应用场景：将释放资源的语句用`defer`修饰，就可以做到延迟释放

## defer + recover错误处理机制
```go
package main

import "fmt"

func main() {
    f()
    fmt.Println("Returned normally from f.")
} 

func f() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered in f", r)
        }
    }()
    fmt.Println("Calling g.")
    g(0)
    fmt.Println("Returned normally from g.")
}

func g(i int) {
    if i > 3 {
        fmt.Println("Panicking!")
        panic(fmt.Sprintf("%v", i))
    }
    defer fmt.Println("Defer in g", i)
    fmt.Println("Printing in g", i)
    g(i + 1)
}

/* Output:
Calling g.
Printing in g 0
Printing in g 1
Printing in g 2
Printing in g 3
Panicking!
Defer in g 3
Defer in g 2
Defer in g 1
Defer in g 0
Recovered in f 4
Returned normally from f.*/
```
recover只在defer调用的函数中有效，并且defer要在panic之前先注册，否则不能捕获异常。当panic被捕获到之后，被注册的函数将获得程序控制权。

panic与error的区别（有点类似Java中的Error和Exception）：
- error可作为返回值返回，一般是可预知的，可以进行合适的处理，不会造成程序的终止
- panic一般是无法预知的异常，如空指针或者数组越界，会导致程序崩溃

## 数组
```go
var arr1 [3]int = [3]int{3, 6, 9}
var arr2 = [3]int{1, 4, 7}
var arr3 = [...]int{4, 5, 6, 7}
var arr4 = [...]int{2:66, 0:33, 1:99, 3:88}
```

- 长度属于类型的一部分
- Go中数组属于值类型，在默认情况下是值传递，因此会进行值拷贝
- 如果想在其他函数中去修改原来的数组，可以使用引用传递
```go
package main
	
import "fmt"
	
func main() {
    arr := [3]int{3, 6, 9}
    test(&arr)
    fmt.Println(arr)
}
	
func test(arr *[]int) {
    (*arr)[0] = 8
}
```

## 切片
- 定义一个切片，然后让切片去引用一个已经创建好的数组
```go
var arr [6]int = [6]int{3, 6, 9, 1, 4, 7}
slice := arr[1:3]
```
- 通过`make`内置函数来创建切片
```go
slice := make([]int, 4, 20)
fmt.Println(slice) // [0 0 0 0]
fmt.Println(len(slice)) // 4
fmt.Println(cap(slice)) // 20
slice[0] = 66
slice[1] = 88
fmt.Println(slice) // [66 88 0 0]

slice2 := []int{1, 4, 7}
fmt.Println(slice2)
fmt.Println(len(slice2)) // 3
fmt.Println(cap(slice2)) // 3
```

注意事项：
- 切片使用不能越界
- 简写方式：`var slice = arr[0:len(arr)] => var slice = arr[:]`
- 可以对切片继续切片

`append`函数：
```go
package main

import "fmt"

func main() {
    var arr [6]int = [6]int{1, 2, 3, 4, 5, 6}
    slice := arr[1:4]
    fmt.Println(&slice[0]) // 0xc0000a8038
    fmt.Println(cap(slice)) // 5
    slice2 := append(slice, 7, 8, 9) 
    fmt.Println(&slice2[0]) // 0xc0000aa0a0
    fmt.Println(slice) // [2 3 4]
    fmt.Println(slice2) // [2 3 4 7 8 9]
}
```
- `append`函数不改变原切片
- 当切片大小超出容量时，会创建一个新的底层数组，并将旧数组拷贝到新的数组中

## 映射
```go
package main

import "fmt"

func main() {
    var mp map[int]string = make(map[int]string, 10) // 可以不指定大小
    mp[0] = "value0"
    mp[1] = "value1"
    fmt.Println(mp) // map[0:value0 1:value1]

    mp1 := map[int]string(
        0 : "value0",
        1 : "value1"
    )

    // 删除
    delete(mp, 0) // 如果key不存在，则不进行操作，不会报错

    // 查找
    value, if_exist := mp[2] // 如果未找到，则if_exist为false，value为空

    // 遍历
    for k, v := range mp {
        // ,,,
    }
}
```
- slice、map、function不可作为key

## 结构体
```go
package main

import "fmt"

type Teacher struct {
    Name   string
    Age    int
    School string
}

func main() {
    var teacher Teacher
    fmt.Println(teacher) // { 0 } 其实为 {"" 0 ""}
    teacher.Name = "张三"
    teacher.Age = 30
    teacher.School = "清华大学"
    fmt.Println(teacher) // {张三 30 清华大学}

    var teacher2 Teacher = Teacher{"李四", 31, "北京大学"}

    var teacher3 Teacher = new(Teacher)
    (*t).Name = "王五"
    (*t).Age = 32
    t.School = "深圳大学" // 在go中允许通过指针直接访问结构体的字段，而不需要显式解引用
}
```

如果两个变量分别所属的结构体类型不同，但是字段完全相同，就可以通过强制类型转换来进行赋值
```go
package main

import "fmt"

type Student struct {
    Name string
    Age int
}

  

type Person struct {
    Name string
    Age int
}

  

func main() {
    s := Student{"Alice", 20}
    p := Person{"Bob", 30}
    
    s = Student(p)
    fmt.Println(s)
}
```

### 方法
```go
type A struct {
    Num int
}

func (a A) test() {
    // ...
}
```
- 这里相当于定义了结构体A的一个方法test，用`(a A)`来体现方法test和结构体A的绑定关系（不一定是a，名字任意）
- 结构体对象传入方法中时是值传递
- 如果想要在方法中改变结构体对象的字段，需要在方法中接收指针，例如：
```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func (p *Person) ChangeName() {
    p.Name = "New Name"
}

func main() {
    p := Person{"Bob", 30}
    p.ChangeName()
    fmt.Println(p)
}
```
- 不一定是结构体，给基本数据类型如`int`等起别名后，也可以给基本数据类型定义方法
- 如果一个结构体实现了`String()`方法，那么在`print`的时候就会根据这个方法的返回值进行打印，类似Java中的`toString()`方法
```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func (p *Person) String() string {
    return fmt.Sprintf("%s is %d years old", p.Name, p.Age)
}

func main() {
    p := Person{
	    Name : "Bob", 
	    Age : 30
	}
    fmt.Println(&p)
}
```

## 封装
在go中的封装总的来说就是根据**首字母大小写**实现的权限控制机制

## 继承
```go
type Animal struct {
    Name string
    Age int
}

type Cat struct {
    Animal
}
```
- 结构体可以使用嵌套匿名结构体的所有字段和方法，即：**首字母大写/小写的字段和方法都可以使用**。例如如果上述结构体`Animal`中的`Age`字段为`age`，也依然可以通过`Cat.Animal.age`来访问
- 匿名结构体字段访问可以简化。例如`Cat.Animal.Age`可以简化为`Cat.Age`，会**先查找`Cat`中是否存在`Age`字段**，如果有就直接使用，否则进入嵌套的结构体内寻找
- 支持多继承，也就是一个结构体中可以嵌套多个结构体
- 结构体的匿名字段可以是基本数据类型
```go
type C struct {
    int
}
	
c.int // 访问int字段
```
- 也可以嵌入匿名结构体的指针
```go
type C struct {
    *A
}
```
- 结构体的字段可以是结构体类型的（组合模式）
```go
type B struct {
}
	
type D struct {
    c B
}
```

## 接口
**Go语言中的接口是隐式实现的，也就是说，如果一个类型实现了一个接口定义的所有方法，那么它就是自动地实现了该接口**
```go
package main

import "fmt"

type Phone interface {
    call()
}

type NokiaPhone struct {
}

func (nokiaPhone NokiaPhone) call() {
    fmt.Println("I am Nokia, I can call you!")
}

type IPhone struct {
}

func (iPhone IPhone) call() {
    fmt.Println("I am iPhone, I can call you!")
}

func main() {
    var phone Phone

    phone = new(NokiaPhone)
    phone.call()

    phone = new(IPhone)
    phone.call()
}
```
- 接口本身不能创建实例，但是可以指向一个实现了该接口的自定义类型的变量
- 只要是自定义数据类型，就可以实现接口，不仅仅是结构体类型
- 一个自定义类型可以实现多个接口
- 一个接口可以继承多个别的接口。例如A接口继承了B接口和C接口，那么在实现A接口时就需要同时实现B接口和C接口中的方法

## 断言
用于判断是否是某个类型的变量的语法，类似Java中的`instanceof`：`value, ok := element.(T)`，这里`value`就是变量的值，`ok`是一个`bool`类型，`element`是`interface`变量，`T`是断言的类型
- 也可以用`element.type()`来获取接口变量的类型，然后搭配`switch`进行控制
- `interface{}`万能指针可以指向任意类型的变量

## 反射
### pair结构
在Golang中，变量包含两部分：`type`和`value`，`type`可能是`static type`（int、string...）或者是`concrete type`（`interface`指向的具体类型，系统能看得见的类型），`value`中保存的是具体的值。这里的`type, value`对就被称为`pair`结构
```go
package main

import "fmt"

type Reader interface {
    Read()
}

type Writer interface{
    Write()
}

type Book struct {
}

func (book *Book) Read() {
    fmt.Println("Read a book")
}

func (book *Book) Write() {
    fmt.Println("Write a book")
}

func main() {
    // b: pair<type: Book, value: book{}的地址>
    b := &Book{}

    // r: pair<type: , value: >
    var r Reader
    // r: pair<type: Book, value: book{}的地址>
    r = b
    r.Read()

    // w: pair<type: , value: >
    var w Writer
    // w: pair<type: Book, value: book{}的地址>
    w = r.(Writer)
    
    w.Write()
}
```
在这里，无论怎么断言，`b`对应的`pair`结构都是不变的，而`r`之所以可以断言为`Writer`，就是因为他们的`type`都是`Book`，而`Book`实现了`Reader`和`Writer`这两个接口

### reflect
使用`reflect`包下的`TypeOf`和`ValueOf`这两个方法可以获取到变量的类型和值
```go
package main

import (
    "fmt"
    "reflect"
)

type User struct {
    Id int
    Name string
    Age int
}

func (u User) Call() {
    fmt.Println("user is called...")
    fmt.Printf("%v\n", u)
}

func main() {
    user := User{1, "user", 18}

    DoFieldAndMethod(user)
}

func DoFieldAndMethod(input interface{}) {
    inputType := reflect.TypeOf(input)
    fmt.Println("inputType is :", inputType.Name())

    inputValue := reflect.ValueOf(input)
    fmt.Println("inputValue is :", inputValue)

    for i := 0; i < inputType.NumField(); i++ {
        field := inputType.Field(i)
        value := inputValue.Field(i).Interface()

        fmt.Printf("%s: %v = %v\n", field.Name, field.Type, value)
    }

    for i := 0; i < inputType.NumMethod(); i++ {
        m := inputType.Method(i)
        fmt.Printf("%s: %v\n", m.Name, m.Type)
    }
}
```

### tag
```go
package main

import (
    "fmt"
    "reflect"
)

type resume struct {
    Name string `info:"name" doc:"我的名字"` // info and doc tag
    Sex  string `info:"sex"` // info tag
}

func findTag(str interface{}) {
    t := reflect.TypeOf(str).Elem()

    for i := 0; i < t.NumField(); i++ {
        taginfo := t.Field(i).Tag.Get("info")
        tagdoc := t.Field(i).Tag.Get("doc")
        fmt.Println("info: ", taginfo, " doc: ", tagdoc)
    }
}

func main() {
    var re resume

    findTag(&re)
}
```
`tag`的主要用途是**建立结构体字段与`json key`的映射**
```go
package main

import (
    "encoding/json"
    "fmt"
)

type Movie struct {
    Title  string   `json:"title"`
    Year   int      `json:"year"`
    Price  int      `json:"rmb"`
    Actors []string `json:"actors"`
}

func main() {
    movie := Movie{"喜剧之王", 2000, 10, []string{"xingye", "zhangbozhi"}}

    // struct to json
    jsonStr, err := json.Marshal(movie)
    if err != nil {
        fmt.Println("json marshal error", err) // jsonStr = {"title":"喜剧之王","year":2000,"rmb":10,"actors":["xingye","zhangbozhi"]}
        return
    }

    fmt.Printf("jsonStr = %s\n", jsonStr)

    // json str to struct
    myMovie := Movie{}
    err = json.Unmarshal(jsonStr, &myMovie)
    if err != nil {
        fmt.Println("json unmarshal error", err)
        return
    }
    fmt.Println(myMovie) // {喜剧之王 2000 10 [xingye zhangbozhi]}
}
```
可以看出，tag中定义的`json:key`对应的就是json中的key

## 协程
GMP：G（goroutine，协程），M（内核线程），P（processor，协程调度器）
### goroutine基本模型和调度策略
![goroutine基本模型和调度策略](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20241112204304.png)
调度器的设计策略：复用线程（work stealing机制，hand off机制）、利用并行（GOMAXPROCS=CPU核心数/2）、抢占、全局G队列

### 创建一个goroutine
```go
package main

import (
    "fmt"
    "time"
)

// 子goroutine
func newTask() {
    i := 0
    for {
        i++
        fmt.Printf("new goroutine : i = %d\n", i)
        time.Sleep(1 * time.Second)
    }
}

// 主goroutine
func main() {
    go newTask()

    i := 0
    for {
        i++
        fmt.Printf("main goroutine : i = %d\n", i)
        time.Sleep(1 * time.Second)
    }
}
```
子goroutine依赖于主goroutine，主goroutine结束后子goroutine也会结束执行
可以使用`runtime.Goexit()`退出当前的goroutine

### channel
channel是用于协程间通信的一块数据区域，可以理解为一个管道
```go
package main

import (
    "fmt"
)

func main() {
    c := make(chan int)

    go func() {
        defer fmt.Println("goroutine结束")

        fmt.Println("goroutine 正在运行...")

        c <- 666
    }()

    num := <-c

    fmt.Println("num = ", num)
    fmt.Println("main goroutine执行结束...")
}
```
对于这里的`main goroutine`和`sub goroutine`之间的数据通信，可以发现`channel`是阻塞读写的，写入后需要被读取才能继续向下执行，同理，读取操作也会阻塞等待有数据写入后再进行读取。以上`channel`被称为无缓冲的`channel`

而对于有缓冲的`channel`：
```go
package main

import (
    "fmt"
    "time"
)

func main() {
    c := make(chan int, 3)

    fmt.Println("len(c) =", len(c), ", cap(c) =", cap(c))

    go func() {
        defer fmt.Println("子goroutine结束")

        for i := 0; i < 4; i++ { // 当写入第四个元素时会阻塞
            c <- i
            fmt.Println("子go程正在运行，发送的元素 =", i, ",len(c) =", len(c), ",cap(c) =", cap(c))
        }
    }()

    time.Sleep(time.Second * 2)

    for i := 0; i < 4; i++ {
        num := <-c
        fmt.Println("num =", num)
    }

    fmt.Println("main goroutine结束")
}
```
当`channel`已满时，再向里面写数据，就会阻塞；当`channel`为空时，从里面取数据也会阻塞

### channel的关闭特点
```go
package main

import (
    "fmt"
)

func main() {
    c := make(chan int)

    go func() {
        for i := 0; i < 5; i++ {
            c <- i
        }

        close(c)
    }()

    for {
        if data, ok := <-c; ok {
            fmt.Println(data)
        } else {
            fmt.Println("channel closed")
            break
        }
    }

    fmt.Println("Main finished..")
}
```
- `channel`不像文件一样需要经常去关闭，只有当你确实没有任何发送数据了，或者你想显式地结束`range`循环之类的，才去关闭`channel`
- 关闭`channel`后，无法向`channel`中再发送数据（引发`panic`错误后导致接收立即返回零值）
- 关闭`channel`后，可以继续从`channel`接收数据
- 对于`nil channel`，无论收发都会被阻塞

### range
对于：
```go
for {
    if data, ok := <-c; ok {
        fmt.Println(data)
    } else {
        break
    }
}
```
可以修改为：
```go
for data := range c {
    fmt.Println(data)
}
```

### select
单流程下一个`goroutine`只能监控一个`channel`的状态，`select`可以完成监控多个`channel`的状态。`select`具备多路`channel`的监控状态功能
```go
select {
case <- chan1:
    // 如果chan1成功读到数据，则进行该case处理语句
case chan2 <- 1:
    // 如果成功向chan2写入数据，则进行该case处理语句
default:
    // 如果上面都没有成功，则进入default处理流程
}
```

## Go Modules
GOPATH工作模式的弊端
- 无版本控制概念
- 无法同步一致第三方版本号
- 无法指定当前项目引用的第三方版本号

go mod命令：
- go mod init：生成go.mod文件
- go mod download：下载go.mod文件中指明的所有依赖
- go mod tidy：整理现有的依赖
- go mod graph：查看现有的依赖结构
- go mod edit：编辑go.mod文件
- go mod vendor：导出项目中所有的依赖到vendor目录
- go mod verify：校验一个模块是否被篡改过
- go mod why：查看为什么需要依赖某模块

go mod环境变量：
- GO111MODULE：表示是否开启go modules模式，建议go1.11后都设置为on
- GOPROXY：项目的第三方依赖库的下载源地址
- GOSUMDB：用来检验拉取的第三方库是否完整
- GONOPROXY
- GONOSUMDB
- GOPRIVATE：设置私有仓库，对这里的仓库将不会进行GOPROXY下载和校验

### 使用Go Modules初始化项目
首先要开启Go Modules模块：保证`GO111MODULE`环境变量的值为`on`，可以通过`go env -w GO111MODULE=on`或`export GO111MODULE=on`两种方式来修改
在初始化项目时，可以按照以下步骤：
1. 任意文件夹创建项目（不要求在`$GOPATH/src`）
2. 创建go.mod文件，指定当前项目的模块名称（`go mod init xxx`）
	- 在该go.mod文件中会显示go版本、当前模块和依赖项等信息
3. 在该项目下编写源代码
	- 如果代码中依赖某个库，可以采用手动download（`go get xxx`）或自动download（`go run xxx`）的形式下载依赖库
	- 依赖库会存放到`$GOPATH/pkg`路径下
4. 下载依赖库后，go.mod文件中会出现依赖库的信息
	- 包含依赖库名称，依赖库版本，是否直接引用（`indirect`表示间接引用，引用的是依赖库的某个子模块时会显示）
5. 会生成一个go.sum文件，用于罗列当前项目的依赖库和版本，并做哈希校验，保证依赖库的版本不会被改动

### 修改模块依赖关系
可以使用`go mod edit -replace=${old version}=${new version}`来替换依赖库的版本号，对于go.mod文件的改动则会多一行`replace`语句