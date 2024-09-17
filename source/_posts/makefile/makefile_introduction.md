---
title: 跟我一起写Makefile-Makefile介绍
date: 2024-09-17 15:18:26
category: makefile
tags: makefile
---

make命令执行时，需要一个makefile文件，以告诉make命令需要怎么去编译和链接程序。

<!-- more -->

首先，用一个示例来说明makefile的书写规则，在这个示例中，我们的工程有8个c文件，3个头文件。我们要写一个makefile来告诉make命令如何编译和链接这几个文件，我们的规则是：
1. 如果这个工程没有编译过，那么我们的所有c文件都要编译并被链接。
2. 如果这个工程的某几个c文件被修改，那么我们只编译被修改的c文件，并链接目标程序。
3. 如果这个工程的头文件被改变了，那么我们需要编译引用了这几个头文件的c文件，并链接目标程序。
只要我们的makefile写得够好，所有的这一切只用一个make命令就可以完成，make命令会自动智能地根据当前的文件修改情况来确定哪些文件需要重编译，从而自动编译所需要的文件和链接目标程序。

---

# makefile的规则

```makefile
target ... : prerequisites ...
	recipe
	...
	...
```

* **target**: 可以是一个object file（目标文件），也可以是一个可执行文件，还可以是一个标签（label）。
* **prerequisites**: 生成该target所依赖的文件和/或target。
* **recipe**: 该target要执行的命令（任意的shell命令）。

这是一个文件的依赖关系，也就是说，target这一个或多个的目标文件依赖于prerequisites中的文件，其生成规则定义在recipe中。也就是说：prerequisites中如果有一个以上的文件比target要新的话，recipe中定义的命令就会被执行。
这就是makefile的规则，也就是makefile中最核心的内容。

---

# 一个示例

```makefile
edit : main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o
	cc -o edit main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o

main.o : main.c defs.h
	cc -c main.c
kbd.o : kbd.c defs.h command.h
	cc -c kbd.c
command.o : command.c defs.h command.h
	cc -c command.c
display.o : display.c defs.h buffer.h
	cc -c display.c
insert.o : insert.c defs.h buffer.h
	cc -c insert.c
search.o : search.c defs.h buffer.h
	cc -c search.c
files.o : files.c defs.h buffer.h command.h
	cc -c files.c
utils.o : utils.c defs.h
	cc -c utils.c
clean : 
	rm edit main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o
```

在定义好了依赖关系后，后续的recipe行定义了如何生成target的操作系统命令，**一定要以一个`Tab`键作为开头**。make并不管命令是如何工作的，它只管执行所定义的命令。make会比较targets和prerequisites的修改日期，如果prerequisites的日期比targets的日期要新，或者targets不存在的话，那么make就会执行recipe中定义的命令。

这里要说明的一点是，`clean`并不是一个文件，它只是一个动作的名字，其冒号后面什么也没有，那么，make就不会自动去寻找它的依赖项，也就不会自动执行其后所定义的命令。要执行其后的命令，就要在make命令后显式地指定这个label的名字。这样的方法非常有用，我们可以在一个makefile中定义不用的编译或是和编译无关的命令，比如程序的打包，程序的备份等等。

---

# make是如何工作的

在默认的方式下，也就是我们只输入`make`命令，那么：

1. make会在当前目录下寻找名字叫“Makefile”或者“makefile”的文件。
2. 如果找到，它会找文件中的第一个target，在上面的例子中，就是“edit”这个文件，并把这个文件当作最终的target。
3. 如果edit这个文件不存在，或是edit所依赖的后面的`.o`文件的文件修改时间要比`edit`这个文件新，那么，它就会执行后面所定义的命令来生成`edit`这个文件。
4. 如果`edit`所依赖的`.o`文件也不存在，那么make会在当前文件中找目标为`.o`文件的依赖项，如果找到则再根据那一个规则生成`.o`文件。
5. 最终，依赖的C文件和头文件是存在的，因此make会生成`.o`文件，然后再用`.o`文件生成make的最终target，也就是`edit`。

这就是整个make的依赖性，它会一层层地去寻找文件中的依赖关系，直到最终编译出第一个目标文件。在寻找的过程中，如果出现错误，比如最终被依赖的文件找不到，那么make会直接退出并报错，而对于recipe中所定义的命令的错误，比如编译不成功，make根本不管，它**只关注文件之间的依赖关系**。

---

# makefile中使用变量

在上面的例子中，我们可以看到一长串`.o`文件的字符串被重复了多次，如果需要添加一个`.o`文件，则需要改动多处，当makefile变得复杂时，容易忘记某个需要加入的地方，导致编译失败。因此为了makefile的易维护，在makefile中我们可以使用变量。

比如，我们可以在makefile中的一开始就像这样定义：

```makefile
objects = main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o
```

于是，我们就可以很方便地在我们的makefile中以`$(objects)`的方式来使用这个变量了：

```makefile
objects = main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o

edit : $(objects)
	cc -o edit $(objects)

main.o : main.c defs.h
	cc -c main.c
kbd.o : kbd.c defs.h command.h
	cc -c kbd.c
command.o : command.c defs.h command.h
	cc -c command.c
display.o : display.c defs.h buffer.h
	cc -c display.c
insert.o : insert.c defs.h buffer.h
	cc -c insert.c
search.o : search.c defs.h buffer.h
	cc -c search.c
files.o : files.c defs.h buffer.h command.h
	cc -c files.c
utils.o : utils.c defs.h
	cc -c utils.c
clean : 
	rm edit $(objects)
```

---

# 让make自动推导

GNU的make很强大，它可以自动推导文件以及文件依赖关系后面的命令，于是我们就没必要去在每一个`.o`文件后都写上类似的命令，因为，我们的make会自动识别，并自己推导命令。

只要make看到一个`.o`文件，它就会自动的把`.c`文件加在依赖关系中，如果make找到一个`whatever.o`，那么`whatever.c`就会是`whatever.o`的依赖文件。并且`cc -c whatever.c`也会被推导出来，于是，我们的makefile再也不用写得这么复杂：

```makefile
objects = main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o

edit : $(objects)
	cc -o edit $(objects)

main.o : defs.h
kbd.o : defs.h command.h
command.o : defs.h command.h
display.o : defs.h buffer.h
insert.o : defs.h buffer.h
search.o : defs.h buffer.h
files.o : defs.h buffer.h command.h
utils.o : defs.h

.PHONY : clean
clean : 
	rm edit $(objects)
```

这种方法就是make的“隐式规则”，在上面的文件中，`.PHONY`表示`clean`是个伪目标文件。

---

# makefile的另一种风格

既然make可以自动推导命令，那么是否能把重复的`.h`文件收拢起来呢？

```makefile
objects = main.o kbd.o command.o display.o \
		insert.o search.o files.o utils.o

edit : $(objects)
	cc -o edit $(objects)

$(objects) : defs.h
kbd.o command.o files.o : command.h
display.o insert.o search.o files.o : buffer.h

.PHONY : clean
clean : 
	rm edit $(objects)
```

这里`defs.h`是所有目标文件的依赖文件，`command.h`和`buffer.h`是对应target的依赖文件。
这种风格能让我们的makefile变得很短，但是文件的依赖关系就显得有些凌乱了，鱼和熊掌不可兼得。

---

# 清空目录的规则

每个Makefile中都应该写一个清空目标文件（`.o`）和可执行文件的规则，这不仅便于重编译，也很利于保持文件的清洁。一般的风格是：

```makefile
clean:
	rm edit $(objects)
```

更为稳健的做法是：

```makefile
.PHONY : clean
clean : 
	-rm edit $(objects)
```

前面说过，`.PHONY`表示`clean`是一个“伪目标”。而在`rm`命令前面加一个`-`的意思就是，也许某些文件出现问题，但不要管，继续做后面的事。当然，`clean`的规则不要放在文件的开头，不然这会变成make的默认目标。不成文的规则是——“clean从来都放在文件的最后”。

---

# Makefile的文件名

默认情况下，make命令会在当前目录下按顺序寻找文件名为`GNUmakefile`、`makefile`和`Makefile`的文件。在这三个文件名中，最好使用`Makefile`这个文件名，因为它在排序上靠近其它比较重要的文件，比如`README`。最好不要用`GNUmakefile`，因为这个文件名只能由GNU`make`，其他版本的`make`无法识别，但是基本上来说，大多数的`make`都支持`makefile`和`Makefile`这两种默认文件名。

当然，你可以使用别的文件名来书写Makefile，如果要指定特定的Makefile，你可以使用make的`-f`或`--file`参数，如：`make -f Make.Linux`。如果使用多条`-f`或`--file`参数，则可以指定多个makefile。

---

# 包含其它Makefile

在Makefile使用`include`命令可以把别的Makefile包含进来，这很像C语言的`#include`，被包含的文件会原模原样地放在当前文件的包含位置。`include`的语法是：

```makefile
include <filenames>...
```

`<filenames>`可以是当前操作系统Shell的文件模式（可以包含路径和通配符）。
**在`include`前面可以有一些空字符，但是绝不能是`Tab`键开始。**`include`和`<filenames>`可以用一个或多个空格隔开。举个例子，你有这样几个Makefile：`a.mk`、`b.mk`、`c.mk`，还有一个文件叫`foo.make`，以及一个变量`$(bar)`，其包含了`bish`和`bash`，那么，下面的语句：

```makefile
include foo.make *.mk $(bar)
```

等价于：

```makefile
include foo.make a.mk b.mk c.mk bish bash
```

make命令开始时，会找寻`include`所指出的其他Makefile，并把其内容安置在当前的位置。就好像C/C++的`#include`指令一样。如果文件都没有指定绝对路径或是相对路径的话，make会在当前目录下首先寻找，如果当前目录下没有找到，那么，make还会在下面的几个目录下找：

1. 如果make执行时，有`-I`或`--include-dir`参数，那么make就会在这个参数所指定的目录下去寻找。
2. 接下来按顺序寻找目录`<prefix>/include`（一般是`/usr/local/bin`）、`/usr/gnu/include`、`/usr/local/include`、`/usr/include`。

环境变量`.INCLUDE_DIRS`包含当前make会寻找的目录列表。你应当避免使用命令行参数`-I`来寻找以上这些默认目录，否则会使得`make`“忘掉”所有已经设定的包含目录，包含默认目录。

如果有文件没有找到的话，make会生成一条警告信息，但不会马上出现致命错误。它会继续载入其它的文件，一旦完成makefile的读取，make会再重试这些没有找到，或是不能读取的文件，如果还是不行，make才会出现一条致命信息。如果你想让make不理那些无法读取的文件，而继续执行，你可以在include前加一个减号“-”。如：

```makefile
-include <filenames>...
```

这表示无论include过程中出现什么错误，都不要报错继续执行，如果要和其他版本`make`兼容，可以使用`sinclude`代替`-include`。

---

# 环境变量MAKEFILES

如果你的当前环境中定义了环境变量`MAKEFILES`，那么make会把这个变量中的值做一个类似于`include`的动作。这个变量中的值是其它的Makefile，用空格分隔。只是，和`include`不同的是，**从这个环境变量中引入的Makefile的“默认目标”不会起作用，如果环境变量中定义的文件发现错误，make也会不理。**

**建议不要使用这个环境变量**，因为只要这个变量一被定义，那么当使用make时，所有的Makefile都会受到它的影响。

---

# make的工作方式

GNU的make工作时的执行步骤如下：

1. 读入所有的Makefile。
2. 读入被include的其它Makefile。
3. 初始化文件中的变量。
4. 推导隐式规则，并分析所有规则。
5. 为所有的目标文件创建依赖关系链。
6. 根据依赖关系，决定哪些目标要重新生成。
7. 执行生成命令。

1-5步为第一个阶段，6-7步为第二个阶段。在第一个阶段中，如果定义的变量被使用了，那么make会把其展开在使用的位置。但make并不会完全马上展开，make使用的是拖延战术，如果变量出现在依赖关系的规则中，那么仅当这条依赖被决定要使用了，变量才会在其内部展开。