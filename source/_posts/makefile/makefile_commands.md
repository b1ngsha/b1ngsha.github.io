---
title: 跟我一起写Makefile-Makefile书写命令
date: 2024-09-18 22:36:24
category: makefile
tags: makefile
---

每条规则中的命令和操作系统Shell的命令行是一致的。make会一按顺序一条一条的执行命令，每条命令的开头必须以 Tab 键开头，除非，命令是紧跟在依赖规则后面的分号后的。在命令行之间中的空格或是空行会被忽略，但是如果该空格或空行是以Tab键开头的，那么make会认为其是一个空命令。

<!-- more -->

# 显示命令

通常，make会把其要执行的命令行在命令执行前输出到屏幕上。当我们把`@`字符放在命令行前时，这个命令将不被make显示出来，最具代表性的例子是，我们用这个功能来向屏幕现实一些信息。如：

```makefile
@echo 正在编译xxx模块...
```

当make执行时，会输出“正在编译xxx模块...”，但不会输出命令，如果没有`@`，那么make将输出：

```bash
echo 正在编译xxx模块...
正在编译xxx模块...
```

如果make执行时，带入了参数`-n`或`--just-print`，那么它只会显示命令，但不会执行命令，这个功能很有利于调试Makefile。而参数`-s`或`--silent`或`--quiet`则是全面禁止命令的显示。

---

# 命令执行

如果你要让上一条命令的结果作用在下一条命令时，你应该使用分号分隔这两条命令。比如你的第一条命令是cd命令，你希望第二条命令在cd之后的基础上运行，那么你就不能把这两条命令写在两行，而是同一行，用分号分隔。例如：

```makefile
exec:
	cd /home/usr
	pwd

exec:
	cd /home/usr; pwd
```

在第一个例子中，`cd`将不会生效，`pwd`会打印当前的Makefile目录，而在第二个例子中，`cd`就会起作用了，`pwd`会打印出`/home/usr`。

---

# 命令出错

如果某个规则中的某个命令出错了（命令退出码非零），那么make就会终止执行当前规则，这将有可能终止所有规则的执行。

有些时候命令的出错并不代表着执行是错误的，例如`mkdir`命令，如果目录已经存在也会出错。为了忽略命令的错误，可以在Makefile的命令行前面加一个`-`号，标记为不管命令是否出错都认为是成功的。例如：

```makefile
clean:
	-rm -f *.o
```

还有一个全局的方法是，给make加上`-i`或是`--ignore-errors`参数，那么Makefile中的所有命令都会忽略错误。而如果一个规则是以`.IGNORE`为目标的，那么这个规则中的所有命令将会忽略错误。
还有一个参数是`-k`或是`--keep-going`，表示如果某规则中的命令出错了，那么终止该规则的执行，但继续执行其它规则。

---

# 嵌套执行make

在一些大工程中，我们会把不同模块或者是不同功能的源文件放在不同的目录下，并在每个目录中都写一个该目录的Makefile，这样更有利于维护。
例如，我们有一个子目录叫subdir，这个目录下有一个Makefile文件，来指明这个目录下文件的编译规则。那么我们总控的Makefile可以这样写：

```makefile
subsystem:
	cd subdir && $(MAKE)

或

subsystem:
	$(MAKE) -C subdir
```

定义MAKE宏变量的意思是也许我们的make需要一些参数，所以定义成一个变量比较利于维护。这两个例子的意思都是先进入subdir目录，然后执行make命令。
我们把顶层的Makefile叫做“总控Makefile”，这个Makefile中的变量可以传递到下级的Makefile当中，但是不会覆盖下级中定义的变量，除非指定了`-e`参数。

如果要传递变量到下级Makefile中，可以这样声明：

```makefile
export <variable ...>;
```

如果不想传递，则可以这样声明：

```makefile
unexport <variable ...>;
```

对于：

```makefile
export variable = value

variable = value
export variable

export variable := value

variable := value
export variable
```

它们都是等价的。
**如果需要传递所有变量，直接`export`即可，不需要跟随变量，表示传递所有。**

需要注意的是，有两个变量：`SHELL`和`MAKEFLAGS`，这两个变量**无论是否export，都要传递到下层的Makefile中**，特别是`MAKEFLAGS`，其中包含了make的参数信息，如果我们执行“总控Makefile”的时候有make参数或者是在上层的Makefile中定义了这个变量，那么`MAKEFLAGS`变量中将包含这些参数，并向下传递，这是一个系统级别的环境变量。

但是make命令中的有几个参数并不会向下传递，它们是`-C`，`-f`，`-h`，`-o`和`-W`，如果你不想往下层传递参数，那么可以这样：

```makefile
subsystem:
	cd subdir && $(MAKE) MAKEFLAGS=
```

如果定义了`MAKEFLAGS`，那么你就得确信其中的选项是大家都会用到的。

还有一个在“嵌套执行”中比较有用的参数，`-w`或者是`--print-directory`会在make的执行过程中输出一些信息，让你看到目前的工作目录。比如，当我们的下级make目录是“/home/usr/gnu/make”时，如果我们使用`make -w`来执行，那么当进入该目录时，我们会看到：

```makefile
make: Entering directory '/home/usr/gnu/make'
```

make完成后离开时，会看到：

```makefile
make: Leaving directory '/home/usr/gnu/make'
```

当你使用`-C`参数来指定make下层的Makefile时，`-w`会被自动打开。如果参数中有`-s`（`--silent`）或者是`--no-print-directory`，那么`-w`总是失效的。

---

# 定义命令包

如果Makefile中出现一些相同的命令序列，那么我们可以为这些相同的命令序列定义一个变量。定义这种命令序列的语法以`define`开始，以`endf`结束，如：

```makefile
define run-yacc
yacc $(firstword $^)
mv y.tab.c $@
endef
```

这里，“run-yacc”是这个命令包的名字，**不要和Makefile中的变量重名**。在`define`和`endef`之间的就是命令序列。

要使用这个命令包的话，像是使用变量一样即可：

```makefile
foo.c : foo.y
	$(run-yacc)
```