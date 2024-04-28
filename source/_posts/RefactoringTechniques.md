---
title: Refactoring Techniques
date: 2024-04-28 21:58:20
tags: Refactoring
categories: Refactoring
---

After reading the whole article, I think some techniques below seems like a bit "over-refactoring", but some are truly useful. Just use it according to the actual situation.

<!--more-->
## Composing Methods

Much of refactoring is devoted to correctly composing methods. In most cases, excessively long methods are the root of all evil. The vagaries of code inside these methods conceal the execution logic and make the method extremely hard to understand—and even harder to change.

The refactoring techniques in this group streamline methods, remove code duplication, and pave the way for future improvements.



### Extract Method

Problem: You have a code fragment that can be grouped together.

Solution: Move this code to a separate new method (or function) and replace the old code with a call to the method.

```java
// before
void printOwing() {
    printBanner();
    
    // Print details.
    System.out.println("name: " + name);
    System.out.println("amount: " + getOutstanding());
}

// after
void printOwing() {
    printBanner();
    
    printDetails(getOutsanding());
}

void printDetails(double outstanding) {
    System.out.println("name: " + name);
    System.out.println("amount: " + outstanding);
}
```



### Inline Method

**Problem:** When a method body is more obvious than the method itself, use this technique.

**Solution:** Replace calls to the method with the method's content and delete the method itself.

```java
// before
class PizzaDelivery {
    int getRating() {
        return moreThanFiveLateDeliveries() ? 2 : 1;
    }
    boolean moreThanFiveLateDeliveries() {
        return numberOfLateDeliveries() > 5;
    }
}

// after
class PizzaDelivery {
    int getRating() {
        return numberOfLateDeliveries > 5 ? 2 : 1;
    }
}
```



### Extract Variable

**Problem: **You have an expression that's hard to understand.

**Solution:** Place the result of the expression or its parts in separate variables that are self-explanatory.

```java
// before
void renderBanner() {
    if ((platform.toUpperCase().indexOf("MAC") > -1) &&
        (platform.toUpperCase().indexOf("IE") > -1) && 
        wasInitialized() && resize > 0) {
        // do something
    }
}

// after
void renderBanner() {
    final boolean isMacOS = platform.toUpperCase().indexOf("MAC") > -1;
    final boolean isIE = platform.toUpperCase().indexOf("IE") > -1;
    final boolean wasResized = resize > 0;
    
    if (isMacOS && isIE && wasInitialized() && wasResized) {
        // do something
    }
}
```

**Drawback:** 

When refactoring conditional expressions, remember that the compiler will most likely optimize it to minimize the amount of calculations needed to establish the resulting value. Say you have a following expression `if (a() || b()) ...`. The program won’t call the method `b` if the method `a` returns `true` because the resulting value will still be `true`, no matter what value returns `b`.

However, if you extract parts of this expression into variables, both methods will always be called, which might hurt performance of the program, especially if these methods do some heavyweight work.



### Inline Temp

**Problem:** You have a temporary variables that's assigned the result of a simple expression and nothing more.

**Solution:** Replace the references to the variable with the expression itself.

```java
// before
boolean hasDiscount(Order order) {
    double basePrice = order.basePrice();
    return basePrice > 1000;
}

// after
boolean hasDiscount(Order order) {
    return order.basePrice() > 1000;
}
```

**Drawback:** Sometimes seemingly useless temps are used to cache the result of an expensive operation that’s reused several times. So before using this refactoring technique, make sure that simplicity won’t come at the cost of performance.



### Replace Temp with Query

**Problem: **You place the result of an expression in a local variable for later use in your code.

**Solution:** Move the entire expression to a separate method and return the result from it. Query the method instead of using a variable. Incorporate the new method in other methods, if necessary.

```java
// before
double calculateTotal() {
    double basePrice = quantity * itemPrice;
  	if (basePrice > 1000) {
    	return basePrice * 0.95;
  	}
  	else {
    	return basePrice * 0.98;
  	}
}

// after
double calculateTotal() {
    if (basePrice() > 1000) {
        return basePrice() * 0.95;
    } else {
        return basePrice() * 0.98;
    }
}
double basePrice() {
    return quantity * itemPrice;
}
```

**Good to Know: **If your temp variable is used to cache the result of a truly time-consuming expression, you may want to stop this refactoring after extracting the expression to a new method.



### Split Temporary Variable

**Problem: **You have a local variable that’s used to store various intermediate values inside a method (except for cycle variables).

**Solution:** Use different variables for different values. Each variable should be responsible for only one particular thing.

```java
// before
double temp = 2 * (height + width);
temp = height * width;

// after
final double perimeter = 2 * (height + width);
final double area = height * width;
```



### Remove Assignments to Parameters

**Problem:** Some value is assigned to a parameter inside method’s body.

**Solution:** Use a local variable instead of a parameter.

```java
// before
int discount(int inputVal, int quantity) {
    if (quantity > 50) {
        inputVal -= 2;
    }
}

// after
int discount(int inputVal, int quantity) {
    int result = inputVal;
    if (quantity > 50) {
        result -= 2;
    }
}
```



### Remove Method with Method Object

**Problem:** You have a long method in which the local variables are so intertwined that you can't apply **Extract Method**.

**Solution:** Transform the method into a separate class so that the local variables become fields of the class. Then you can split the method into several methods within the same class.

```java
// before
class Order {
    public double price() {
        double primaryBasePrice;
        double secondaryBasePrice;
        double tertiaryBasePrice;
        // Perform long computation.
    }
}

// after
class Order {
    public double price() {
        return new PriceCalculator(this).compute;
    }
}

class PriceCalculator {
    private double primaryBasePrice;
    private double secondaryBasePrice;
    private double tertiaryBasePrice;
    
    public PriceCalculator(Order order) {
        // Copy relevant information from the order object.
    }
    
    public double compute() {
        // Perform long computation.
    }
}
```



### Substitute Algorithm

**Problem:** So you want to replace an existing algorithm with a new one?

**Solution:** Replace the body of the method that implements the algorithm with a new algorithm.

```java
// before
String foundPerson(String[] people) {
    for (int i = 0; i < people.length; i++) {
        if (people[i].equals("Don")) {
            return "Don";
        }
        if (people[i].equals("John")) {
            return "John";
        }
        if (people[i].equals("Kent")) {
            return "Kent";
        }
    }
    return "";
}

// after
String foundPerson(String[] people) {
    List candidates = Arrays.asList(new String[] {"Don", "John", "Kent"});
  	for (int i = 0; i < people.length; i++) {
        if (candidates.contains(people[i])) {
            return people[i];
        }
    }
  	return "";
}
```

> I have to say, in this example, even if the code is more readable, the "new algorithm" turns O(n) time complexity into O(mn) lol^^



## Moving Features between Objects

These refactoring techniques shows how to safely move functionality between classes, create new classes, and hide implementation details from public access.



### Move Method

**Problem:** A method is used more in another class than in its own class.

**Solution:** Create a new method in the class that uses the method the most, then move code from the old method to there. Turn the code of the original method into a reference to the new method in the other class or else remove it entirely.



### Move Field

**Problem:** A field is used more in another class than in its own class.

**Solution:** Create a field in a new class and redirect all users of the old field to it.



### Extract Class

**Problem:** When one class does the work of two, awkwardness results.

**Solution:** Instead, create a new class and place the fields and methods responsible for the relevant functionality in it.



### Inline Class

**Problem:** A class does almost nothing and isn’t responsible for anything, and no additional responsibilities are planned for it.

**Solution:** Move all features from the class to another one.



### Hide Delegate

**Problem:** The client gets object B from a field or method of object A. Then the client calls a method of object B.

**Solution:** Create a new method in class A that delegates the call to object B. Now the client doesn't know about, or depend on, class B.

```java
// before
// In this case, if client want to get the manager, it should call Person's method getDepartment() first, then getManager(), a call chain appears.
class Person {
    private Department dept;
    
    public Department getDepartment() {
        return dept;
    }
}

class Department {
    private Manager manager;
    
    public Manager getManager() {
        return manager;
    }
}

// after
class Person {
    private Department dept;
    private Manager manager;
    
    public Department getDepartment() {
        return dept;
    }
    
    public Manager getManager() {
        return manager;
    }
}
```

**Why to refactor:** A call chain appears when a client requests an object from another object, then the second object requests another one, and so on. These sequences of calls involve the client in navigation along the class structure. Any changes in these interrelationships will require changes on the client side.



### Remove Middle Man

**Problem:** A class has too many methods that simply delegate to other objects.

**Solution:** Delete these methods and force the client to call the end methods directly.



### Introduce Foreign Method

**Problem:** A utility class doesn't contain the method that you need and you can't add the method to the class.

**Solution:** Add the method to a client class and pass an object of the utility class to it as an argument.

```java
// before
// in this case, we can't add a method to calcute the next day in class Date.
class Report {
    void sendReport() {
        Date nextDay = new Date(previousEnd.getYear(), 
                                previousEnd.getMonth(), 
                                previousEnd.getDate() + 1);
    }
}

// after
// So, we can add a method to a client class and pass an Date object to it
class Report {
    void sendReport() {
        Date newDate = nextDay(previousEnd);
    }
    
    private static Date nextDay(Date arg) {
        return new Date(arg.getYear(), 
                        arg.getMonth(), 
                        arg.getDate() + 1);
    }
}
```



### Introduce Local Extension

**Problem:** A utility class doesn’t contain some methods that you need. But you can’t add these methods to the class.

**Solution: **Create a new class containing the methods and make it either the child or wrapper of the utility class.

**Why Refactor:**

The class that you’re using doesn’t have the methods that you need. What’s worse, you can’t add these methods (because the classes are in a third-party library, for example). There are two ways out:

- Create a **subclass** from the relevant class, containing the methods and inheriting everything else from the parent class. This way is easier but is sometimes blocked by the utility class itself (due to `final`).
- Create a **wrapper** class that contains all the new methods and elsewhere will delegate to the related object from the utility class. This method is more work since you need not only code to maintain the relationship between the wrapper and utility object, but also a large number of simple delegating methods in order to emulate the public interface of the utility class.



## Organizing Data

These refactoring techniques help with data handling, replacing primitives with rich class functionality.

Another important result is untangling of class associations, which makes classes more portable and reusable.



### Change Value to Reference

**Problem**: So you have many identical instances of a single class that you need to replace with a single object.

**Solution**: Convert the identical objects to a single reference object.



### Change Reference to Value

**Problem:** You have a reference object that’s too small and infrequently changed to justify managing its life cycle.

**Solution:** Turn it into a value object.



### Replace Data Value with Object

**Problem:** A class (or group of classes) contains a data field. The field has its own behavior and associated data.

**Solution:** Create a new class, place the old field and its behavior in the class, and store the object of the class in the original class.



### Replace Array with Object

**Problem:** You have an array that contains various types of data.

**Solution:** Replace the array with an object that will have separate fields for each element.

```java
// before
String[] row = new String[2];
row[0] = "Liverpool";
row[1] = "15";

// after
Performance row = new Performance();
row.setName("Liverpool");
row.setWins("15");
```



### Duplicate Observed Data

**Problem:** Is domain data stored in classes responsible for the GUI?

**Solution:** Then it's a good idea to separate the data into separate classes, ensuring connection and synchronization between the domain class and the GUI.



### Change Unidirectional Association to Bidirectional

**Problem:** You have two classes that each need to use the features of the other, but the association between them is only unidirectional.

**Solution:** Add the missing association to the class that needs it.



### Change Bidirectional Association to Unidirectional

**Problem:** You have a bidirectional association between classes, but one of the classes doesn't use the other's features.

**Solution:** Remove the unused association.



### Replace Magic Number with Symbolic Constant

**Problem:** Your code uses a number that has a certain meaning to it.

**Solution:** Replace this number with a constant that has a human-readable name explaining the meaning of the number.

```java
// before
double potentialEnergy(double mass, double height) {
    return mass * height * 9.81;
}

// after
static final double GRAVITATIONAL_CONSTANT = 9.81;
double potentialEnergy(double mass, double height) {
    return mass * height * GRAVITATIONAL_CONSTANT;
}
```



### Encapsulate Field

**Problem:** You have a public field.

**Solution:** Make the field private and create access methods for it.

```java
// before
class Person {
    public String name;
}

// after
class Person {
    private String name;
    
    public String getName() {
        return name;
    }
    
    public void setName(String arg) {
        name = arg;
    }
}
```



### Encapsulate Collection

**Problem:** A class contains a collection field and a sinple getter and setter for working with the collection.

**Solution:** Make the getter-returned value read-only and create methods for adding/deleting elements of the collection.



### Replace Type Code with Class

> **What’s type code?** Type code occurs when, instead of a separate data type, you have a set of numbers or strings that form a list of allowable values for some entity. Often these specific numbers and strings are given understandable names via constants, which is the reason for why such type code is encountered so much.

**Problem:** A class has a field that contains type code. The values of this type aren't used in operator conditions and don't affect the behavior of the program.

**Solution:** Create a new class and use its objects instead of the type code values.

**Why Refactor:** 

For example, you have the class `User` with the field `user_role`, which contains information about the access privileges of each user, whether administrator, editor, or ordinary user. So in this case, this information is coded in the field as `A`, `E`, and `U` respectively.

What are the shortcomings of this approach? The field setters often don’t check which value is sent, which can cause big problems when someone sends unintended or wrong values to these fields.



### Replace Type Code with Subclasses

**Problem:** You have a coded type that directly affects program behavior (values of this field trigger various code in conditionals).

**Solution:** Create subclasses for each value of the coded type. Then extract the relevant behaviors from the original class to these subclasses. Replace the control flow code with polymorphism.



### Replace Type Code with State/Strategy

**Problem:** You have a coded type that affects behavior but you can’t use subclasses to get rid of it.

**Solution:** Replace type code with a state object. If it’s necessary to replace a field value with type code, another state object is “plugged in”.

**Good to Know:** 

Implementation of this refactoring technique can make use of one of two design patterns: **State** or **Strategy**.

If you’re trying to split a conditional that controls the selection of algorithms, use Strategy.

But if each value of the coded type is responsible not only for selecting an algorithm but for the whole condition of the class, class state, field values, and many other actions, State is better for the job.



### Replace Subclass with Fields

**Problem:** You have subclasses differing only in their (constant-returning) methods.

**Solution:** Replace the methods with fields in the parent class and delete the subclasses.



## Simplifying Conditional Expressions

### Decompose Conditional

Conditionals tend to get more and more complicated in their logic over time, and there are yet more techniques to combat this as well.

**Problem:** You have a complex conditional(`if-then`/`else` or `switch`)

**Solution:** Decompose the complicated parts of the conditional into separate methods: the condition, `then` and `else`.

```java
// before
if (date.before(SUMMER_START) || date.after(SUMMER_END)) {
    charge = quantity * winterRate * winterServiceCharge;
} else {
 	charge = quantity * summerRate;   
}

// after 
if (isSummer(date)) {
    charge = summerCharge(quantity);
} else {
    charge = winterCharge(quantity);
}
```



### Consolidate Conditional Expression

**Problem:** You have multiple conditionals that lead to the same result or action.

**Solution:** Consolidate all these conditionals in a single expression.

```java
// before
double disabilityAmount() {
    if (senioiry < 2) {
        return 0;
    }
    if (monthsDisabled > 12) {
        return 0;
    }
    if (isPartTime) {
        return 0;
    }
}

// after
double disabilityAmount() {
    if (isNotEligibleForDisability) {
        return 0;
    }
}
```



### Consolidate Duplicate Conditional Fragments

**Problem:** Identical code can be found in all branches of a conditional.

**Solution:** Move the code outside of the conditional.

```java
// before
if (isSpecialDeal()) {
    total = price * 0.95;
    send();
} else {
    total = price * 0.98;
    send();
}

// after
if (isSpecialDeal()) {
    total = price * 0.95;
} else {
    total = price * 0.98;
}
send();
```



### Remove Control Flag

**Problem:** You have a boolean variable that acts as a control flag for multiple boolean expressions.

**Solution:** Instead of the variable, use `break`, `continue` and `return`.



### Replace Nested Conditional with Guard Clauses

**Problem:** You have a group of nested conditionals and it's hard to determine the normal flow of code execution.

**Solution:** Isolate all special checks and edge cases into separate clauses and place them before the main checks. Ideally, you should have a “flat” list of conditionals, one after the other.

```java
// before
public double getPayAmount() {
    double result;
    if (isDead) {
        result = deadAmount();
    } else {
        if (isSeparated) {
            result = separatedAmount();
        } else {
            if (isRetired) {
                result = retiredAmount();
            } else {
                result = normalPayAmount();
            }
        }
    }
    return result;
}

// after
public double getPayAmount() {
    if (isDead) {
        return deadAmount();
    }
    if (isSeparated) {
        return separatedAmount();
    }
    if (isRetired) {
        return retiredAmount();
    }
    return normalPayAmount();
}
```



### Replace Conditional with Polymorphism

**Problem:** You have a conditional that performs various actions depending on object type or properties.

**Solution:** Create subclasses matching the branches of the conditional. In them, create a shared method and move code from the corresponding branch of the conditional to it. Then replace the conditional with the relevant method call. The result is that the proper implementation will be attained via polymorphism depending on the object class.

```java
// before
class Bird {
    double getSpeed() {
        switch (type) {
            case EUROPEAN:
                return getBaseSpeed();
            case AFRICAN:
                return getBaseSpeed() - getLoadFactor() * numberOfCoconuts;
            case NORWEGIAN_BLUE:
                return (isNailed) ? 0 : getBaseSpeed(voltage);
        }
        throw new RuntimeException("Should be unreachable");
    }
}

// after
abstract class Bird {
    abstract double getSpeed();
}

class European extends Bird {
    double getSpeed() {
        return getBaseSpeed();
    }
}

class African extends Bird {
    double getSpeed() {
        return getBaseSpeed() - getLoadFactor() * numberOfCoconuts;
    }
}

class NorwegianBlue extends Bird {
    double getSpeed() {
        return (isNailed) ? 0 : getBaseSpeed(voltage);
    }
}

// Somewhere in client code 
speed = bird.getSpeed();
```



### Introduce Null Object

**Problem:** Since some methods return `null` instead of real objects, you have many checks for `null` in your code.

**Solution:** Instead of `null`, return a null object that exhibits the default behavior.

```java
// before
if (customer == null) {
    plan = BillingPlan.basic();
} else {
    plan = customer.getPlan();
}

// after
class NullCustomer extends Customer {
    boolean isNull() {
        return true;
    }
    Plan getPlan() {
        return new NullPlan();
    }
}
// Replace null values with Null-object.
customer = (order.customer != null) ? order.customer : new NullCustomer();
// Use Null-object as if it's normal subclass.
plan = customer.getPlan();
```



### Introduce Assertion

**Problem:** For a portion of code to work correctly, certain conditions or values must be true.

**Solution:** Replace these assumptions with specific assertion checks.

```java
// before
double getExpenseLimit() {
    // Should have either expense limit or a primary project.
    return (expenseLimit != NULL_EXPENSE) ? expenseLimit : primaryProject.getMemberExpenseLimit();
}

// after
double getExpenseLimit() {
    Assert.isTrue(expenseLimit != NULL_EXPENSE || primaryProject != null);
    return (expenseLimit != NULL_EXPENSE) ? expenseLimit : primaryProject.getMemberExpenseLim
}
```



## Simplifying Method Calls

These techniques make method calls simpler and easier to understand. This, in turn, simplifies the interfaces for interaction between classes.



### Rename Method

**Problem:** The name of a method doesn’t explain what the method does.

**Solution:** Rename the method.



### Add Parameter

**Problem:** A method doesn’t have enough data to perform certain actions.

**Solution:** Create a new parameter to pass the necessary data.



### Remove Parameter

**Problem:** A parameter isn’t used in the body of a method.

**Solution:** Remove the unused parameter.



### Separate Query from Modifier

**Problem:** Do you have a method that returns a value but also changes something inside an object?

**Solution:** Split the method into two separate methods. As you would expect, one of them should return the value and the other one modifies the object.



### Parameterize Method

**Problem:** Multiple methods perform similar actions that are different only in their internal values, numbers or operations.

**Solution:** Combine these methods by using a parameter that will pass the necessary special value.



### Replace Parameter with Explicit Methods

**Problem:** A method is split into parts, each of which is run depending on the value of a parameter.

**Solution:** Extract the individual parts of the method into their own methods and call them instead of the original method.

```java
// before
void setValue(String name, int value) {
    if (name.equals("height")) {
        height = value;
        return;
    }
    if (name.equals("width")) {
        width = value;
        return;
    }
    Assert.shouldNeverReachHere();
}

// after 
void setHeight(int arg) {
    height = arg;
}
void setWidth(int arg) {
    width = arg;
}
```



### Preserve Whole Object

**Problem:** You get several values from an object and then pass them as parameters to a method.

**Solution:** Instead, try passing the whole object.

```java
// before
int low = daysTempRange.getLow();
int high = daysTempRange.getHigh();
boolean withinPlan = plan.withinRange(low, high);

// after
boolean withinPlan = plan.withinRange(daysTempRange);
```



### Replace Parameter with Method Call

**Problem:** Calling a query method and passing its results as the parameters of another method, while that method could call the query directly.

**Solution:** Instead of passing the value through a parameter, try placing a query call inside the method body.

```java
// before
int basePrice = quantity * itemPrice;
double seasonDiscount = this.getSeasonalDiscount();
double fees = this.getFees();
double finalPrice = discountedPrice(basePrice, seasonDiscount, fees);

// after
int basePrice = quantity * itemPrice;
double finalPrice = discountedPrice(basePrice);
```



### Introduce Parameter Object

**Problem:** Your methods contain a repeating group of parameters.

**Solution:** Replace these parameters with an object.

![Replace parameters with an object](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240427152833960.png)



### Remove Setting Method

**Problem:** The value of a field should be set only when it’s created, and not change at any time after that.

**Solution:** So remove methods that set the field’s value.



### Hide Method

**Problem:** A method isn’t used by other classes or is used only inside its own class hierarchy.

**Solution:** Make the method private or protected.



### Replace Constructor with Factory Method

**Problem:** You have a complex constructor that does something more than just setting parameter values in object fields.

**Solution:** Create a factory method and use it to replace constructor calls.

```java
// before
class Employee {
    Employee(int type) {
        this.type = type;
    }
}

// after
class Employee {
    static Employee create(int type) {
        employee = new Employee(type);
        // do some heavy lifting.
        return employee;
    }
}
```



### Replace Error Code with Exception

**Problem:** A method returns a special value that indicates an error.

**Solution:** Throw an exception instead.

```java
// before
int withdraw(int amount) {
    if (amount > _balance) {
        return -1;
    } else {
        balance -= amount;
        return 0;
    }
}

// after
void withdraw(int amount) throw BalanceException {
    if (amount > _balance) {
        throw new BalanceException();
    }
    balance -= amount;
}
```



## Replace Exception with Test

**Problem:** You throw an exception in a place where a simple test would do the job.

**Solution:** Replace the exception with a condition test.

```java
// before
double getValueForPeriod(int periodNumber) {
    try {
        return values[periodNumber];
    } catch (ArrayIndexOutOfBoundsException e) {
        return 0;
    }
}

// after
double getValueForPeriod(int periodNumber) {
    if (periodNumber >= values.length) {
        return 0;
    }
    return values[periodNumber];
}
```



### Dealing with Generalization

**Problem:** Two classes have the same field.

**Solution:** Remove the field from subclasses and move it to the superclass.



### Pull Up Method

**Problem:** Your subclasses have methods that perform similar work.

**Solution:** Make the methods identical and then move them to the relevant superclass.



### Pull Up Constructor Body

**Problem:** Your subclasses have constructors with code that's mostly identical.

**Solution:** Create a superclass constructor and move the code that's the same in the subclasses to it. Call the superclass constructor in the subclass constructors.

```java
// before
class Manager extends Employee {
    public Manager(String name, String id, int grade) {
        this.name = name;
        this.id = id;
        this.grade = grade;
    }
}

// after
class Manager extends Employee {
    public Manager(String name, String id, int grade) {
        super(name, id);
        this.grade = grade;
    }
}
```



### Push Down Method

**Problem:** Is behavior implemented in a superclass used by only one (or a few) subclasses?

**Solution:** Move this behavior to the subclasses.



### Push Down Field

**Problem:** Is a field used only in a few subclasses?

**Solution:** Move the field to these subclasses.



### Extract Subclass

**Problem:** A class has features that are used only in certain cases.

**Solution:** Create a subclass and use it in these cases.



### Extract Superclass

**Problem:** You have two classes with common fields and methods.

**Solution:** Create a shared superclass for them and move all the identical fields and methods to it.



### Extract Interface

**Problem:** Multiple clients are using the same part of a class interface. Another case: part of the interface in two classes is the same.

**Solution:** Move this identical portion to its own interface.



### Collapse Hierarchy

**Problem:** You have a class hierarchy in which a subclass is practically the same as its superclass.

**Solution:** Merge the subclass and superclass.



### Collapse Hierarchy

**Problem:** You have a class hierarchy in which a subclass is practically the same as its superclass.

**Solution:** Merge the subclass and superclass.



### Form Template Method

**Problem:** Your subclasses implement algorithms that contain similar steps in the same order.

**Solution:** Move the algorithm structure and identical steps to a superclass, and leave implementation of the different steps in the subclasses.



### Replace Inheritance with Delegation

**Problem:** You have a subclass that uses only a portion of the methods of its superclass (or it’s not possible to inherit superclass data).

**Solution:** Create a field and put a superclass object in it, delegate methods to the superclass object, and get rid of inheritance.



### Replace Delegation with Inheritance

**Problem:** A class contains many simple methods that delegate to all methods of another class.

**Solution:** Make the class a delegate inheritor, which makes the delegating methods unnecessary.