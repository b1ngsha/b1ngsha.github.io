---
title: Missing Semester Lecture 2 - Shell Tools and Scripting
date: 2024-08-27 21:02:03
category: Missing Semester
tags: 
- Missing Semester
- Bash
- Linux
---

MIT The Missing semester Lecture of Your CS Education Lecture 2 - Shell Tools and Scripting

<!-- more -->

## Shell Scripting

To assign variables in bash, use the syntax `foo=bar` and access the value of the variable with `$foo`. Note that `foo = bar` will not work since it it interpreted as calling the `foo` program with arguments `=` and `bar`. In general, in shell scripts the space character will perform argument splitting.

Strings in bash can be defined with `'` and `"` delimiters, but they are not equivalent. Strings delimited with `'` are literal strings and will not substitute variable values whereas `"` delimited strings will.
```bash
foo=bar
echo "$foo"
# prints bar
echo '$foo'
# prints $foo
```

Here is an example of a function that creates a directory and `cd`s into it:
```bash
mcd () {
    mkdir -p "$1"
    cd "$1"
}
```
Here `$1` is the first argument to the script/function. Unlike other scripting languages, bash uses a variety of special variables to refer to arguments, error codes and other relevant variables. Below is a list of some of them. 
- `$0` - Name of the script
- `$1` to `$9` - Arguments to the script. `$1` is the first argument and so on.
- `$@` - All the arguments
- `$#` - Number of arguments
- `$?` - Return code of the previous command (A value of 0 usually means everything went OK; anything different from 0 means an error occurred.)
- `$$` - PID for the current script
- `!!` - Entire last command, including arguments.
- `$_` - Last argument from the last command.
> A more comprehensive list can be found [here](https://tldp.org/LDP/abs/html/special-chars.html).

Exit codes can be used to conditionally execute commands using `&&` and `||`, both of which are short-circuiting operators. Commands can also be separated within the same line using a semicolon `;`. 
```bash
false || echo "Oops, fail"
# Oops, fail

true || echo "Will not be printed"
#

true && echo "Things went well"
# Things went well

false && echo "Will not be printed"
#

true ; echo "This will always run"
# This will always run

false ; echo "This will always run"
# This will always run
```

Another common pattern is wanting to get the output of a command as a variable. This can be done with _command substitution_. Whenever you place `$( CMD )` it will execute `CMD`, get the output of the command and substitute it in place. For example, if you do `for file in $(ls)`, the shell will first call `ls` and then iterate over those values.
A lesser known similar feature is _process substitution_, `<( CMD )` will execute `CMD` and place the output in a temporary file and substitute the `<()` with that file's name. This is useful when commands expect values to be passed by file instead of by STDIN. For example, `diff <(ls foo) <(ls bar)` will show differences between files in dirs `foo` and `bar`.

Let’s see an example that showcases some of these features. It will iterate through the arguments we provide, `grep` for the string `foobar`, and append it to the file as a comment if it’s not found.

```bash
#!/bin/bash

echo "Starting program at $(date)" # Date will be substituted

echo "Running program $0 with $# arguments with pid $$"

for file in "$@"; do
    grep foobar "$file" > /dev/null 2> /dev/null
    # When pattern is not found, grep has exit status 1
    # We redirect STDOUT and STDERR to a null register since we do not care about them
    if [[ $? -ne 0 ]]; then
        echo "File $file does not have any foobar, adding one"
        echo "# foobar" >> "$file"
    fi
done
```

>Here `grep foobar "$file" > /dev/null` means throw away the output of `grep`. `2` is a file descriptor in bash means `stderr`, so `2> /dev/null` means rewire the `stderr` to `null`.

-----

### Shell _globbing_

- Wildcards - Whenever you want to perform some sort of wildcard matching, you can use `?` and `*` to match one or any amount of characters respectively. For instance, given files `foo`, `foo1`, `foo2`, `foo10` and `bar`, the command `rm foo?` will delete `foo1` and `foo2` whereas `rm foo*` will delete all but `bar`.
- Curly braces `{}` - Whenever you have a common substring in a series of commands, you can use curly braces for bash to expand this automatically. This comes in very handy when moving or converting files.

```bash
convert image.{png,jpg}
# Will expand to
convert image.png image.jpg

cp /path/to/project/{foo,bar,baz}.sh /newpath
# Will expand to
cp /path/to/project/foo.sh /path/to/project/bar.sh /path/to/project/baz.sh /newpath

# Globbing techniques can also be combined
mv *{.py,.sh} folder
# Will move all *.py and *.sh files


mkdir foo bar
# This creates files foo/a, foo/b, ... foo/h, bar/a, bar/b, ... bar/h
touch {foo,bar}/{a..h}
touch foo/x bar/y
# Show differences between files in foo and bar
diff <(ls foo) <(ls bar)
# Outputs
# < x
# ---
# > y
```

-----

## Exercises

1. Read [`man ls`](https://www.man7.org/linux/man-pages/man1/ls.1.html) and write an `ls` command that lists files in the following manner
    
    - Includes all files, including hidden files
    - Sizes are listed in human readable format (e.g. 454M instead of 454279954)
    - Files are ordered by recency
    - Output is colorized
    
    A sample output would look like this
    
    ```bash
	-rw-r--r--   1 user group 1.1M Jan 14 09:53 baz
    drwxr-xr-x   5 user group  160 Jan 14 09:53 .
    -rw-r--r--   1 user group  514 Jan 14 06:42 bar
    -rw-r--r--   1 user group 106M Jan 13 12:12 foo
    drwx------+ 47 user group 1.5K Jan 12 18:08 ..
    ```

```bash
	ls -a -t -h -l --color

	-a, --all
              do not ignore entries starting with .
	-t                         sort by modification time, newest first
	--color[=WHEN]
              colorize  the  output;  WHEN can be 'never', 'auto', or 'always' (the
              default); more info below
	-h, --human-readable
              with -l, print sizes in human readable format (e.g., 1K 234M 2G)
```

2. Write bash functions `marco` and `polo` that do the following. Whenever you execute `marco` the current working directory should be saved in some manner, then when you execute `polo`, no matter what directory you are in, `polo` should `cd` you back to the directory where you executed `marco`. For ease of debugging you can write the code in a file `marco.sh` and (re)load the definitions to your shell by executing `source marco.sh`.

```bash
	marco() {
	    touch /tmp/missing/current_path
	    echo $(pwd) > /tmp/missing/current_path
	}
	
	polo() {
	    cd $(cat /tmp/missing/current_path)
	}
```

3. Say you have a command that fails rarely. In order to debug it you need to capture its output but it can be time consuming to get a failure run. Write a bash script that runs the following script until it fails and captures its standard output and error streams to files and prints everything at the end. Bonus points if you can also report how many runs it took for the script to fail.
    
```bash
     #!/usr/bin/env bash
    
     n=$(( RANDOM % 100 ))
    
     if [[ n -eq 42 ]]; then
        echo "Something went wrong"
        >&2 echo "The error was using magic numbers"
        exit 1
     fi
    
     echo "Everything went according to plan"
    ```

```bash
	#!/usr/bin/env bash

	touch random_stdout
	touch random_stderr
	
	echo "" > random_stdout
	echo "" > random_stderr
	
	cnt=0
	until [[ $? -ne 0 ]];
	do
	(( cnt += 1 ))
	./random.sh 1>>random_stdout 2>>random_stderr
	done
	
	echo "STDOUT:"
	cat random_stdout
	
	echo "STDERR:"
	cat random_stderr
	
	echo "Iterates $cnt times until failed."

```

4. As we covered in the lecture `find`’s `-exec` can be very powerful for performing operations over the files we are searching for. However, what if we want to do something with **all** the files, like creating a zip file? As you have seen so far commands will take input from both arguments and STDIN. When piping commands, we are connecting STDOUT to STDIN, but some commands like `tar` take inputs from arguments. To bridge this disconnect there’s the [`xargs`](https://www.man7.org/linux/man-pages/man1/xargs.1.html) command which will execute a command using STDIN as arguments. For example `ls | xargs rm` will delete the files in the current directory. Your task is to write a command that recursively finds all HTML files in the folder and makes a zip with them. Note that your command should work even if the files have spaces (hint: check `-d` flag for `xargs`).

```bash
	[root@localhost missing]# find . -name "*.html" | xargs -d "\n" tar -cf htmls.tar
```

5. (Advanced) Write a command or script to recursively find the most recently modified file in a directory. More generally, can you list all files by recency?

```bash
find . -type f | ls -t | head -1
```

```bash
find . -type f | ls -t
```