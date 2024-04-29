---
title: Factory Method
date: 2024-04-29 16:00:45
tags: Design Patterns
categories: Design Patterns
---
Factory method is a creational design pattern which solves the problem of creating product objects without specifying their concrete classes.
<!--more-->
# Intent

**Factory Method** is a creational design patterns that provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

![Superclass and Subclass in Factory Method](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240429141629024.png)

------



# Problem

Imagine that your first version of a logistics app handle transportation only by trucks, so the bulk of your code lives inside the `truck` class. After a while, you receive dozens of requests from sea transportation companies to incorporate sea logistics into the app. So you should add a `ship` class into the app, which you need to make the entire codebase changed. When this situation happened again, the entire codebase changed again. As a result, you will end up with pretty nasty code.

------



# Solution

The Factory Method pattern suggests that you replace direct object construction calls (using the `new` operator) with calls to a special *factory* method. 

![Subclasses can alter the class of objects being returned by the factory method](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240429144443166.png)

Now you can override the factory method in a subclass and change the class of products being created by the method.

There’s a slight limitation though: subclasses may return different types of products only if these products have a common base class or interface. Also, the factory method in the base class should have its return type declared as this interface.

![All products must follow the same interface](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240429144630152.png)

------



# Structure

![Factory Method Structure](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240429150202548.png)

1. The **Product** declares the interface, which is common to all objects that can be produced by the creator and its subclasses.

2. **Concrete Products** are different implementations of the product interface.

3. The **Creator** class declares the factory method that returns new product objects. It’s important that the return type of this method matches the product interface.

   You can declare the factory method as `abstract` to force all subclasses to implement their own versions of the method. As an alternative, the base factory method can return some default product type.

   Note, despite its name, product creation is **not** the primary responsibility of the creator. Usually, the creator class already has some core business logic related to products. The factory method helps to decouple this logic from the concrete product classes.

4. **Concrete Creators** override the base factory method so it returns a different type of product.

Note that the factory method doesn’t have to **create** new instances all the time. It can also return existing objects from a cache, an object pool, or another source.

------



# Applicability

* **Use the Factory Method when you don’t know beforehand the exact types and dependencies of the objects your code should work with.**
* **Use the Factory Method when you want to provide users of your library or framework with a way to extend its internal components.**
* **Use the Factory Method when you want to save system resources by reusing existing objects instead of rebuilding them each time.**

------



# Factory Method in Java

**buttons**

**Button.java: Common product interface**

```java
/**
 * Common interface for all buttons.
 */
public interface Button {
    void render();
    void onClick();
}
```

**HtmlButton.java: Concrete product**

```java
/**
 * HTML button implementation.
 */
public class HtmlButton implements Button {

    public void render() {
        System.out.println("<button>Test Button</button>");
        onClick();
    }

    public void onClick() {
        System.out.println("Click! Button says - 'Hello World!'");
    }
}
```

**WindowsButton.java: One more concrete product**

```java
/**
 * Windows button implementation.
 */
public class WindowsButton implements Button {
    JPanel panel = new JPanel();
    JFrame frame = new JFrame();
    JButton button;

    public void render() {
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        JLabel label = new JLabel("Hello World!");
        label.setOpaque(true);
        label.setBackground(new Color(235, 233, 126));
        label.setFont(new Font("Dialog", Font.BOLD, 44));
        label.setHorizontalAlignment(SwingConstants.CENTER);
        panel.setLayout(new FlowLayout(FlowLayout.CENTER));
        frame.getContentPane().add(panel);
        panel.add(label);
        onClick();
        panel.add(button);

        frame.setSize(320, 200);
        frame.setVisible(true);
        onClick();
    }

    public void onClick() {
        button = new JButton("Exit");
        button.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                frame.setVisible(false);
                System.exit(0);
            }
        });
    }
}
```



**factory**

**Dialog.java: Base creator**

```java
/**
 * Base factory class. Note that "factory" is merely a role for the class. It
 * should have some core business logic which needs different products to be
 * created.
 */
public abstract class Dialog {

    public void renderWindow() {
        // ... other code ...

        Button okButton = createButton();
        okButton.render();
    }

    /**
     * Subclasses will override this method in order to create specific button
     * objects.
     */
    public abstract Button createButton();
}
```

**HtmlDialog.java: Concrete creator**

```java
/**
 * HTML Dialog will produce HTML buttons.
 */
public class HtmlDialog extends Dialog {

    @Override
    public Button createButton() {
        return new HtmlButton();
    }
}
```

**Windows.Dialog.java: One more concrete creator**

```java
/**
 * Windows Dialog will produce Windows buttons.
 */
public class WindowsDialog extends Dialog {

    @Override
    public Button createButton() {
        return new WindowsButton();
    }
}
```

**Demo.java: Client code**

```java
/**
 * Demo class. Everything comes together here.
 */
public class Demo {
    private static Dialog dialog;

    public static void main(String[] args) {
        configure();
        runBusinessLogic();
    }

    /**
     * The concrete factory is usually chosen depending on configuration or
     * environment options.
     */
    static void configure() {
        if (System.getProperty("os.name").equals("Windows 10")) {
            dialog = new WindowsDialog();
        } else {
            dialog = new HtmlDialog();
        }
    }

    /**
     * All of the client code should work with factories and products through
     * abstract interfaces. This way it does not care which factory it works
     * with and what kind of product it returns.
     */
    static void runBusinessLogic() {
        dialog.renderWindow();
    }
}
```

