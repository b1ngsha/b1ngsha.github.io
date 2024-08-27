---
title: Missing Semester Lecture 1 - The Shell
date: 2024-08-25 01:29:43
category: Missing Semester
tags: 
- Missing Semester
- Bash
- Linux
---

MIT The Missing semester Lecture of Your CS Education Lecture 1 - The Shell

<!-- more -->

## Using the shell

When you launch your terminal, you will see a _prompt_ that often looks a little like this:

``` bash
missing:~$ 
```
It tells that you are on the machine `missing` and that your "current working directory", or where you currently are, is `~` **(short for "home")**. **The `$` tells you that you are not the root user.**

We can execute a command with _arguments_ like this:
```bash
missing:~$ echo hello
hello
```
In this case, we told the shell to execute the program `echo` with the argument `hello`. The `echo` program simply prints out its arguments. The shell parses the command by splitting it by white space, and then runs the program indicated by the first word, supplying each subsequent word as an argument that the program can access. If you want to provide an argument that contains spaces or other special characters (e.g., a directory named “My Photos”), **you can either quote the argument with `'` or `"` (`"My Photos"`), or escape just the relevant characters with `\` (`My\ Photos`).**

But how does the shell know how to find the `date` or `echo` programs? When you run commands in your shell, you are really writing a small bit of code that your shell interprets. If the shell is asked to execute a command that doesn’t match one of its programming keywords, it consults an _environment variable_ called `$PATH` that lists which directories the shell should search for programs when it is given a command:

```bash
missing:~$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
missing:~$ which echo
/bin/echo
missing:~$ /bin/echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

When we run the `echo` command, the shell sees that it should execute the program `echo`, and then searches through the `:`-separated list of directories in `$PATH` for a file by that name. When it finds it, it runs it (assuming the file is _executable_; more on that later). We can find out which file is executed for a given program name using the `which` program. We can also bypass `$PATH` entirely by giving the _path_ to the file we want to execute.

-----

## Navigating in the shell

On Linux and macOS, the path `/` is the "root" of the file system, whereas **on Windows there is one root for each disk partition (e.g., `C:\`)**. In a path, **`.` refers to the current directory, and `..` to its parent directory.**

To see what lives in a given directory, we use the `ls` command. Usually, running a program with the `-h` or `--help` flag will print some help text that tells you what flags and options are available. For example, `ls --help` tells us:

```bash
  -l                         use a long listing format
```

```bash
missing:~$ ls -l /home
drwxr-xr-x 1 missing  users  4096 Jun 15  2019 missing
```

This gives us a bunch more information about each file or directory present. First, the `d` at the beginning of the line tells us that `missing` is a directory. Then follow three groups of three characters (`rwx`). These indicate what permissions the owner of the file (`missing`), the owning group (`users`), and everyone else respectively have on the relevant item. A `-` indicates that the given principal does not have the given permission. Above, only the owner is allowed to modify (`w`) the `missing` directory (i.e., **add/remove files in it**). **To enter a directory, a user must have “search” (represented by “execute”: `x`) permissions on that directory (and its parents). To list its contents, a user must have read (`r`) permissions on that directory.** For files, the permissions are as you would expect. Notice that nearly all the files in `/bin` have the `x` permission set for the last group, “everyone else”, so that anyone can execute those programs.

If you ever want _more_ information about a program’s arguments, inputs, outputs, or how it works in general, give the `man` program a try. It takes as an argument the name of a program, and shows you its _manual page_. Press `q` to exit.

```bash
missing:~$ man ls
```

-----

## Connecting programs

In the shell, programs have two primary “streams” associated with them: their input stream and their output stream. When the program tries to read input, it reads from the input stream, and when it prints something, it prints to its output stream. Normally, a program’s input and output are both your terminal. That is, your keyboard as input and your screen as output. However, we can also rewire those streams!

The simplest form of redirection is `< file` and `> file`. These let you rewire the input and output streams of a program to a file respectively:

```bash
missing:~$ echo hello > hello.txt
missing:~$ cat hello.txt
hello
missing:~$ cat < hello.txt
hello
missing:~$ cat < hello.txt > hello2.txt
missing:~$ cat hello2.txt
hello
```

**You can also use `>>` to append to a file**. Where this kind of input/output redirection really shines is in the use of _pipes_. The `|` operator lets you “chain” programs such that the output of one is the input of another:

```bash
missing:~$ ls -l / | tail -n1
drwxr-xr-x 1 root  root  4096 Jun 20  2019 var
missing:~$ curl --head --silent google.com | grep --ignore-case content-length | cut --delimiter=' ' -f2
219
```

-----

## A versatile and powerful tool

For example, the brightness of your laptop’s screen is exposed through a file called `brightness` under

```
/sys/class/backlight
```

By writing a value into that file, we can change the screen brightness. Your first instinct might be to do something like:

```bash
$ sudo find -L /sys/class/backlight -maxdepth 2 -name '*brightness*'
/sys/class/backlight/thinkpad_screen/brightness
$ cd /sys/class/backlight/thinkpad_screen
$ sudo echo 3 > brightness
An error occurred while redirecting file 'brightness'
open: Permission denied
```

This error may come as a surprise. After all, we ran the command with `sudo`! This is an important thing to know about the shell. Operations like `|`, `>`, and `<` are done _by the shell_, not by the individual program. `echo` and friends do not “know” about `|`. They just read from their input and write to their output, whatever it may be. In the case above, the _shell_ (which is authenticated just as your user) tries to open the brightness file for writing, before setting that as `sudo echo`’s output, but is prevented from doing so since the shell does not run as root. Using this knowledge, we can work around this:

```bash
$ echo 3 | sudo tee brightness
```

Since the `tee` program is the one to open the `/sys` file for writing, and _it_ is running as `root`, the permissions all work out.

-----

## Exercises

1. Because I'm on Windows, so I installed Cent OS 7 to do this exercise. To make sure I'm running an appropriate shell, I try the command:

```bash
[root@localhost ~]# echo $SHELL
/bin/bash
```
and make sure I'm running the right program.

2. Create a new directory called `missing` under `/tmp`

```bash
[root@localhost tmp]# mkdir /tmp/missing
[root@localhost tmp]# ls
missing
```

3. Look up to the `touch` program.

```bash
[root@localhost tmp]# man touch
```

`touch` is mainly used to update the access and modification times of each FILE to the current time.

4. Use `touch` to create a new file called `semester` in `missing`

```bash
[root@localhost missing]# touch semester
```

5. Write the following into that file, one line at a time:

```
#!/bin/sh
curl --head --silent https://missing.csail.mit.edu
```

```bash
[root@localhost missing]# echo '#!/bin/sh' > semester
[root@localhost missing]# echo 'curl --head --silent https://missing.csail.mit.edu' >> semester
```

6. Try to execute the file, i.e. type the path to the script (`./semester`) into your shell and press enter. Understand why it doesn’t work by consulting the output of `ls`.

```bash
[root@localhost missing]# ./semester
-bash: ./semester: 权限不够
[root@localhost missing]# ls -l semester
-rw-r--r--. 1 root root 61 8月  25 00:43 semester
```

It's obviously that the reason why it doesn't work is all groups' users do not have the execute permission.

7. Run the command by explicitly starting the `sh` interpreter, and giving it the file `semester` as the first argument, i.e. `sh semester`. Why does this work, while `./semester` didn’t?

This is because `./semester` requires `semester` be executable, and it uses the shell specified as its first line (in the "shebang", e.g. `#!/bin/sh`), if any. In this case, I don't have `semester` 's execute permission, so it didn't work.
But `sh semester` works as long as `semester` is readable, and it uses `sh` regardless of what the script shebang specifies. In this case, I have `semester`'s read permission, so it worked.

> Reference: [What is the difference between sh and ./ when invoking a shell script? - Unix & Linux Stack Exchange](https://unix.stackexchange.com/questions/364145/what-is-the-difference-between-sh-and-when-invoking-a-shell-script)

8. Look up the `chmod` program.

```bash
[root@localhost missing]# man chmod
```

`chmod` is mainly used to changes the file mode bits of each given file according to mode.

9. Use `chmod` to make it possible to run the command `./semester` rather than having to type `sh semester`. How does your shell know that the file is supposed to be interpreted using `sh`?

```bash
[root@localhost missing]# chmod +x semester
```

Because the shebang in `semester` is `#!/bin/sh`, which specifies using `/bin/sh` to be intercepted.

10. Use `|` and `>` to write the “last modified” date output by `semester` into a file called `last-modified.txt` in your home directory.

```bash
[root@localhost missing]# date -r semester | cat > ~/last-modified.txt
[root@localhost missing]# cat ~/last-modified.txt
2024年 08月 25日 星期日 00:43:31 CST
```
