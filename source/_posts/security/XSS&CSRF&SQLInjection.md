---
title: XSS? CSRF? SQL Injection?
date: 2024-04-22 21:25:59
tags: security
categories: security
---
Some common web security issues that you should know.
<!--more-->
# XSS

**Cross-site scripting (XSS)** is an attack in which an attacker injects malicious executable scripts into the code of a trusted application or website. Attackers often initiate an XSS attack by sending a malicious link to a user and enticing the user to click it. If the app or website lacks proper data sanitization, the malicious link executes the attacker’s chosen code on the user’s system. As a result, the attacker can steal the user’s active session cookie.



Here's an example: 

If the web app is vulnerable to XSS attacks, the user-supplied input executes as code. For example, in the request below, the script displays a message box with the text “xss.”

```js
http://www.site.com/page.php?var=<script>alert('xss');</script>
```



There are mainly three types of XSS attack:

* **Stored XSS**, which takes place when the malicious payload is stored in a database. It renders to other users when data is requested if there is no output encoding or sanitization.
* **Reflected XSS** occurs when a web application sends attacker-provided strings to a victim’s browser so that the browser executes part of the string as code. The payload echoes back in response since it doesn’t have any server-side output encoding.
* **DOM-based XSS** takes place when an attacker injects a script into a response. The attacker can read and manipulate the document object model (DOM) data to craft a malicious URL. The attacker uses this URL to trick a user into clicking it. If the user clicks the link, the attacker can steal the user’s active session information, keystrokes, and so on.



How to avoid XSS vulnerabilities?

* Never trust user input.
* Implement output encoding.
* Follow the defense-in-depth principle.
* Ensure that web application development aligns with OWASP's XSS Prevention Cheat Sheet, which contains techniques to prevent or limit the impact of XSS.
* Perform penetration testing to confirm remediation was successful.



# CSRF

**Cross-Site Request Forgery (CSRF)** is an attack that forces an end user to execute unwanted actions on a web application in which they’re currently authenticated. With a little help of social engineering (such as sending a link via email or chat), an attacker may trick the users of a web application into executing actions of the attacker’s choosing. If the victim is a normal user, a successful CSRF attack can force the user to perform state changing requests like transferring funds, changing their email address, and so forth. If the victim is an administrative account, CSRF can compromise the entire web application.



Here's an example in the GET scenario:

If an application is designed to use GET request to transfer parameters and execute actions, the money transfer operation might be like: `GET http://bank.com/transfer?acct=BOB&amount=100`. So, if you want to build an exploit URL, it can be like: `GET http://bank.com/transfer?acct=MARIA&amount=100000`. As the victim is logged into the bank application, induce he/she to click the url. This is usually done with one of the following techniques:

* sending an unsolicited email with HTML content
* planting an exploit URL or script on pages that are likely to be visited by the victim while they are also doing online banking (XSS attack)

If only the victim click the URL, the browser will submit the request to bank.com without any visual indication that the transfer has taken place.



How to avoid CSRF vulnerbilities?

* Most frameworks have built-in CSRF support.
* See the CSRF Prevention Cheat Sheet for prevention measures.



# SQL Injection

SQL Injection is a type of an injection attack that makes it possible to execute malicious SQL statements. Attackers can use SQL Injection vulnerabilities to bypass application security measures. They can go around authentication and authorization of a web page or web application and retrieve the content of the entire SQL database. They can also use SQL Injection to add, modify, and delete records in the database.



A simple SQL Injection example:

```python
sql = "SELECT id FROM users WHERE username='" + uname + "'AND password='" + passwd + "'"
```

These input fields are vulnerable to SQL Injection. For example, they could use a trick involving a single quote and set the `passwd` field to: `password' OR 1=1`. Because of the `OR 1=1`, the `WHERE` clause returns the first `id` from the `users` table no matter what the `username` and `password` are. Moreover, the first user `id` in a database is very often the administrator. In this way, the attacker not only bypasses authentication but also gains administrator privileges.



How to prevent an SQL Injection:

The only sure way to prevent SQL Injection attacks is input validation and parametrized queries including prepared statements. The application code should never use the input directly. The developer must sanitize all input, not only web form inputs such as login forms. They must remove potential malicious code elements such as single quotes.

