---
title: MRO In Python
date: 2024-06-14 15:38:31
tags: Python
categories: Python
---

For work needs, I'm learning python these days. When I met multiple inheritance, I felt a little bit confused.

<!-- more -->

Here is the example:

```python
class People:
    def __init__(self, name, id, *args, **kwargs):
        print("People init start")
        super().__init__(*args, **kwargs)
        self.name = name
        self.id = id
        print("People init end")

    def speak(self):
        print("My name is: ", self.name)


class Runner:
    def __init__(self, speed, *args, **kwargs):
        print("Runner init start")
        super().__init__(*args, **kwargs)
        self.speed = speed
        print("Runner init end")

    def run(self):
        print("My 100 meter's speed is: ", self.speed)


class Student(People, Runner):
    def __init__(self, food, *args, **kwargs):
        print("Student init start")
        super().__init__(*args, **kwargs)
        self.food = food
        print("Student init end")

    def eat(self):
        print("I like eat:", self.food)

    def speak(self):
        super().speak()
        print("My name is: ", self.name, "I like eat: ", self.food)


s = Student("Noodle", "Tom", "001", 100)
```

The execution result:

```python
Student init start
People init start
Runner init start
Runner init end
People init end
Student init end
```

So, what confused me is why the construct order is `Student -> People -> Runner`?

With this question, I start researching the statement `super().__init__()`, because it looks like the key point to solve this question.

<br>

After finding some materials online, i found **`super().__init__()` invokes the initializer of the next class in the MRO.** So figure out the MRO should be my next step.

<br>

Method Resolution Order (MRO) is the order in which Python looks for a method in a hierarchy of classes. Especially it plays vital role in the context of multiple inheritance as single method may be found in multiple super classes.

<br>

## Case 1

This is a simple case where we have class C derived from both A and B. When method `process()` is called with object of class C then `process()` method in class A is called.

Python constructs the order in which it will look for a method in the hierarchy of classes. It uses this order, known as MRO, to determine which method it actually calls.

It is possible to see MRO of a class using `mro()` method of the class.

![](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240614151904536.png)

```python
class A:
    def process(self):
        print('A process()')


class B:
    pass


class C(A, B):
    pass


obj = C()  
obj.process()    
print(C.mro())   # print MRO for class C
```

When run, the above program displays the following output:

```
A process()
[<class '__main__.C'>, <class '__main__.A'>, <class '__main__.B'>, <class 'object'>]
```

From MRO of class C, we get to know that Python looks for a method first in class C. Then it goes to A and then to B. **So, first it goes to super class given first in the list then second super class, from left to right order.** Then finally Object class, which is a super class for all classes.

<br>

## Case 2

Now, lets change the hierarchy. We create B and C from A and then D from B and C. Method `process()` is present in both A and C. 

![](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240614152053262.png)

```python
class A:
    def process(self):
        print('A process()')


class B(A):
    pass


class C(A):
    def process(self):
        print('C process()')


class D(B,C):
    pass


obj = D()
obj.process()
```

Output of the above program is:

```
C process()
[<class '__main__.D'>, <class '__main__.B'>, <class '__main__.C'>, <class '__main__.A'>, <class 'object'>]
```

When we call `process()` with an object of class D, it should start with first Super class – B (and its super classes) and then second super class – C (and its super classes). If that is the case then we will call `process()` method from class A as B doesn’t have it and A is super class for B.

However, that is contradictory to rule of inheritance, as most specific version must be taken first and then least specific (generic) version. So, calling `process()` from A, which is super class of C, is not correct as C is a direct super class of D. That means C is more specific than A. So method must come from C and not from A.

This is where Python applies a simple rule that says (known as good head question) **when in MRO we have a super class before subclass then it must be removed from that position in MRO.**

So the original MRO will be:

```
D -> B -> A -> C -> A 
```

If you include object class also in MRO then it will be:

```
D -> B-> A -> object -> C -> A -> object 
```

But as A is super class of C, it cannot be before C in MRO. So, Python removes A from that position, which results in new MRO as follows:

```
D -> B -> C -> A -> object 
```

The output of the above program proves that.

<br>

## Case 3

There are cases when Python cannot construct MRO owing to complexity of hierarchy. In such cases it will throw an error as demonstrated by the following code.

![](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240614153606597.png)

```python
class A:
    def process(self):
        print('A process()')


class B(A):
    def process(self):
        print('B process()')


class C(A, B):
    pass


obj = C()
obj.process()
```

When you run the above code, the following error is shown:

```
TypeError: Cannot create a consistent method resolution
order (MRO) for bases A, B
```

The problem comes from the fact that class A is a super class for both C and B. If you construct MRO then it should be like this:

```
C -> A -> B -> A
```

Then according to the rule (good head) A should NOT be ahead of B as A is super class of B. So new MRO must be like this:

```
C -> B -> A 
```

But A is also direct super class of C. So, if a method is in both A and B classes then which version should class C call? According to new MRO, the version in B is called first ahead of A and that is not according to inheritance rules (specific to generic) resulting in Python to throw error.