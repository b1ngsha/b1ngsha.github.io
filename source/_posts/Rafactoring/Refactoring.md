---
title: Refactoring
date: 2024-04-19 23:24:28
tags: Refactoring
categories: Refactoring
---

Refactoring is a systematic process of improving code without creating new functionality that can transform a mess into clean code and simple design.

<!-- more -->
# Clean Code

The main purpose of refactoring is to fight technical debt. It transforms a mess into clean code and simple design.

But what's clean code? Here are some of its features:

* Clean code is obvious for other programmers.
* Clean code doesn't contain duplication.
* Clean code contains a minimal number of classes and other moving parts.
* Clean code passes all tests.
* Clean code is easier and cheaper to maintain.

------



# Technical debt

Everyone does their best to write excellent code from scratch. There probably isn't a programmer out there who intentionally writes unclean code to the detriment of the project. But at what point does clean code become unclean?

The metaphor of "technical debt" in regards to unclean code was originally suggested by Ward Cunningham.

If you get a loan from a bank, this allows you to make purchases faster. You pay extra for expediting the process - you don't just pay off the principal, but also the additional interest on the loan. Needless to say, you can even rack up so much interest that the amount of interest exceeds your total income, making full repayment impossible.

The same thing can happen with code. You can temporarily speed up without writing tests for new features, but this will gradually slow your progress every day until you eventually pay off the debt by writing tests.

------



# When to refactor

**Rule of three**

1. When you're doing something for the first time, just get it done.
2. When you're doing something similar for the second time, cringe at having to repeat but do the same thing anyway.
3. When you're doing something for the third time, start refactoring.

------



# How to reactor

Performing refactoring step-by-step and running tests after each change are key elements of refactoring that make it predictable and safe.

* The code should become cleaner.
* New functionality shouldn't be created during refactoring.
  * Don't mix refactoring and direct development of new features. Try to separate these processes at least within the confines of individual commits.
* All existing tests must pass after refactoring.

------



# Code Smells

Code smells are indicators of problems that can be addressed during refactoring. Code smells are easy to spot and fix, but they may be just symptoms of a deeper problem with code.



## Bloaters

Bloaters are code, methods and classes that have increased to such gargantuan proportions that they're hard to work with.




### Long Method

**Signs and Symptons:** A method contains too many lines of code. Generally, any method longer than 

ten lines should make you start asking questions.

**Treatment:** As a rule of thumb, if you feel the need to comment on something inside a method, you should take this code and put it in a new method. Even a single line can and should be split off into a separate method, if it requires explanations. And if the method has a descriptive name, nobody will need to look at the code to see what it does.



### Large Class

**Signs and Symptoms:** A class contains many fields/methods/lines of code.

**Treatment:** When a class is wearing too many(functional) hats, think about splitting it up.



### Primitive Obsession

**Signs and Symptoms:**

* Use of primitives instead of small objects for simple tasks.
* Use of constants for coding information.
* Use of string constants as field names for use in data arrays.

**Treatment:** The main idea is: Replace primitives with objects.



### Long Parameter List

**Signs and Symptons:** More than three or four parameters for a method.

**When to Ignore:** Don't get rid of parameters if doing so would cause unwanted dependency between classes.



### Data Clumps

**Signs and Symptons:** Sometimes different parts of the code contain itentical groups of variables (such as  parameters for connecting to a database). These clumps should be turned into their own classes.

**Treatment:** Look at the code used by these fields. It may be a good idea to move this code to a data class.

**When to ignore:** Passing an entire object in the parameters of a method, instead of passing just its values (primitive types), may create an undesirable dependency between the two classes.



## Object-Orientation Abusers

All these smells are incomplete or incorrect application of object-oriented programming principles.



### Switch Statements

**Signs and Symptoms:** You have a complex `switch` operator or sequence of `if` statements.

**Treatment:** As a rule of thumb, when you see `switch` you should think of **polymorphism**.

**When to Ignore:** 

* When a `switch` operator performs simple actions, there's no reason to make code changes.
* Often `switch` operators are used by factory design patterns (**Factory Method** or **Abstract Factory**) to select a created class.



### Temporary Field 

**Signs and Symptoms:** Temporary fields get their values (and thus are needed by objects) only under certain circumstances. Outside of these circumstances, they're empty.

**Treatment:** Temporary fields and all code operating on them can be put in a separate class via **Extract Class**. In other words, you're creating a method object, achieving the same result as if you would perfom **Replace Method with Method Object**.



### Refused Bequest

**Signs and Symptoms:** If a subclass uses only some of the methods and properties inherited from its parents, the hierarchy is off-kilter. The unneeded methods may simply go unused or be redefined and give off exceptions.

**Treatment:**

* If inheritance makes no sense and the subclass really does have nothing in common with the superclass, eliminate inheritance in favor of **Replace Inheritance with Delegation**.
* If inheritance is appropirate, get rid of unneeded fields and methods in the subclass. Extract all fields and methods needed by the subclass from the parent class, put them in a new superclass, and set both classes to inherit from it.



### Alternative Classes with Different Interfaces

**Signs and Symptoms:** Two classes perform identical functions but have different method names.

**Treatment:** Try to put the interface of classes in terms of a common denominator.

**When to Ignore:** Sometimes merging classes is impossible or so difficult as to be pointless. One example is when the alternative classes are in different libraries that each have their own version of the class.



## Change Preventers

These smells mean that if you need to change something in one place in your code, you have to make many changes in other places too. Program development becomes much more complicated and expensive as a result.



### Divergent Change

**Signs and Symptoms:** You find yourself having to change many unrelated methods when you make changes to a class. For example, when adding a new product type you have to change the methods for finding, displaying, and ordering products.

**Treatment:** 

* Split up the behavior of the class via Extract Class.
* If different classes have the same behavior, you may want to combine the classes through inheritance.



### Shotgun Surgery

> **Shotgun Surgery** resembles **Divergent Change** but is actually opposite. **Divergent Change** is when many Changes are made to a single class. **Shotgun Surgery** refers to when a single change is made to multiple classes simultaneously.

**Signs and Symptoms:** Making any modifications requires that you make many small changes to many different classes.

**Treatment:**

* Use **Move Method** and **Move Field** to move existing class behaviors into a single class. If there's no class appropriate for this, create a new one.
* If moving code to the same class leaves the original classes almost empty, try to get rid of these now-redundant classes via **Inline Class**.



### Parallel Inheritance Hierarchies

**Signs and Symptoms:** Whenever you create a subclass for a class, you find yourself needing to create a subclass for another class.

**Treatment:** You may de-duplicate parallel class hierarchies in two steps. First, make instances of one hierarchy refer to instances of another hierarchy. Then, remove the hierarchy in the referred class, by using **Move Method** and **Move Field**.

**When to Ignore:** Sometimes having parallel class hierarchies is just a way to avoid even bigger mess with program architecture. If you find that your attempts to de-duplicate hierarchies produce even uglier code, just step out, revert all of your changes and get used to that code. (lol)



## Dispensables

A dispensable is something pointless and unneeded whose absence would make the code cleaner, more efficient and easier to understand.



### Comments

**Signs and Symptoms:** A method is filled with explanatory comments.

> The best comment is a good name for a method or class.

**When to Ignore:**

Comments can sometimes be useful:

- When explaining **why** something is being implemented in a particular way.
- When explaining complex algorithms (when all other methods for simplifying the algorithm have been tried and come up short).



### Data Class

**Signs and Symptoms:** A data class refers to a class that contains only fields and crude methods for accessing them (getters and setters). These are simply containers for data used by other classes. These classes don’t contain any additional functionality and can’t independently operate on the data that they own.

**Treatment:**

- If a class contains public fields, use **Encapsulate Field** to hide them from direct access and require that access be performed via getters and setters only.
- Use **Encapsulate Collection** for data stored in collections (such as arrays).
- Review the client code that uses the class. In it, you may find functionality that would be better located in the data class itself. If this is the case, use **Move Method** and **Extract Method** to migrate this functionality to the data class.
- After the class has been filled with well thought-out methods, you may want to get rid of old methods for data access that give overly broad access to the class data. For this, **Remove Setting Method** and **Hide Method** may be helpful.



### Dead Code

**Signs and Symptoms:** A variable, parameter, field, method or class is no longer used (usually because it’s obsolete).

**Treatment:** 

- Delete unused code and unneeded files.
- In the case of an unnecessary class, **Inline Class** or **Collapse Hierarchy** can be applied if a subclass or superclass is used.
- To remove unneeded parameters, use **Remove Parameter**.



### Speculative Generality

**Signs and Symptoms:** There’s an unused class, method, field or parameter.

**Treatment:**

- For removing unused abstract classes, try **Collapse Hierarchy**.
- Unnecessary delegation of functionality to another class can be eliminated via **Inline Class**.
- Unused methods? Use **Inline Method** to get rid of them.
- Methods with unused parameters should be given a look with the help of **Remove Parameter**.
- Unused fields can be simply deleted.

**When to Ignore:**

- If you’re working on a framework, it’s eminently reasonable to create functionality not used in the framework itself, as long as the functionality is needed by the frameworks’s users.
- Before deleting elements, make sure that they aren’t used in unit tests. This happens if tests need a way to get certain internal information from a class or perform special testing-related actions.



## Couplers

All the smells in this group contribute to excessive coupling between classes or show what happens if coupling is replaced by excessive delegation.



### Feature Envy

**Signs and Symptoms:** A method accesses the data of another object more than its own data.

**Treatment:** As a basic rule, if things change at the same time, you should keep them in the same place. Usually data and functions that use this data are changed together (although exceptions are possible).

**When to Ignore:** Sometimes behavior is purposefully kept separate from the class that holds the data. The usual advantage of this is the ability to dynamically change the behavior (see **Strategy**, **Visitor** and other patterns).



### Inappropriate Intimacy

**Signs and Symptoms:** One class uses the internal fields and methods of another class.

**Treatment:**

- The simplest solution is to use **Move Method** and **Move Field** to move parts of one class to the class in which those parts are used. But this works only if the first class truly doesn’t need these parts.
- Another solution is to use **Extract Class** and **Hide Delegate** on the class to make the code relations “official”.
- If the classes are mutually interdependent, you should use **Change Bidirectional Association to Unidirectional**.
- If this “intimacy” is between a subclass and the superclass, consider **Replace Delegation with Inheritance**.



### Message Chains

**Signs and Symptoms:** In code you see a series of calls resembling `$a->b()->c()->d()`

**Treatment:**

- To delete a message chain, use **Hide Delegate**.
- Sometimes it’s better to think of why the end object is being used. Perhaps it would make sense to use **Extract Method** for this functionality and move it to the beginning of the chain, by using **Move Method**.

**When to Ignore:** Overly aggressive delegate hiding can cause code in which it’s hard to see where the functionality is actually occurring. Which is another way of saying, avoid the **Middle Man** smell as well.



### Middle Man

**Signs and Symptoms:** If a class performs only one action, delegating work to another class, why does it exist at all?

**Treatment:** If most of a method’s classes delegate to another class, **Remove Middle Man** is in order.

**When to Ignore:**

Don’t delete middle man that have been created for a reason:

- A middle man may have been added to avoid interclass dependencies.
- Some design patterns create middle man on purpose (such as **Proxy** or **Decorator**).



### Incomplete Library Class

**Signs and Symptoms:** Sooner or later, libraries stop meeting user needs. The only solution to the problem—changing the library—is often impossible since the library is read-only.

**Treatment:**

- To introduce a few methods to a library class, use **Introduce Foreign Method**.
- For big changes in a class library, use **Introduce Local Extension**.

**When to Ignore:** Extending a library can generate additional work if the changes to the library involve changes in code.