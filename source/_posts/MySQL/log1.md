---
title: MySQL错误日志|二进制日志|查询日志|慢查询日志
date: 2024-03-18 22:10:57
tags: 
- MySQL
- 日志
categories: MySQL
---
## 错误日志

错误日志是MySQL中最重要的日志之一，它**记录了当`mysqld`启动和停止时，以及服务器在运行过程中发生任何严重错误时的相关信息**。当数据库出现异常时，建议首先查看此日志。

该日志是默认开启的。查看错误日志的存储路径：

```sql
SHOW VARIABLES LIKE '%log_error%';
```

![image-20240318171416591](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240318171416591.png)

* `log_error`：错误日志文件路径
* `log_error_services`：控制哪个日志组件启用错误日志，该变量可以包含具有0，1或多组件列表；在最后一种情况下，组件可以用分号或逗号分隔，服务器会按照列出的顺序执行组件
* `log_error_suppression_list`：用于错误日志的事件的抑制作用，有些日志不希望记录下来
* `log_error_verbosity`：日志记录等级。在MGR(MySQL Group Replication)中建议设置为3可以记录更多日志信息，便于追踪问题



## 二进制日志

二进制日志(binlog)记录了**所有的DDL语句和DML语句**，但**不包括数据查询(`SELECT、SHOW`)语句**。

作用：1. 灾难时的数据恢复

> 这里的数据恢复与redolog不同，更多是恢复误操作的数据，而redolog恢复的是还没来得及持久化的数据

2. MySQL的主从复制。在MySQL8中，默认binlog是开启的，涉及到的参数如下：

```sql
SHOW VARIABLES LIKE '%log_bin%';
```

![image-20240318200447602](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240318200447602.png)

* `log_bin_index`：指定binlog文件的路径与名称

* `log_bin_trust_function_creators`：用于控制函数创建者是否可以被信任去创建将要被写入binlog的会造成不安全事件的函数。如果为0，用户将不被允许创建或修改函数除非他们有超级权限，并且函数必须被声明为`DETERMINISTIC`或`READS SQL DATA`或`NO SQL`。如果为1，MySQL则不会做出这些强制要求

  > `DETERMINISTIC`：表示函数或过程是纯函数或过程，即他的输出完全由输入参数确定
  >
  > `NO SQL`：表示函数或过程没有使用MySQL内置的SQL语句，而是使用其他编程语言编写的代码
  >
  > `READS SQL DATA`：表示函数或过程的代码包含SQL语句，并且只能读取数据而不能修改数据
  >
  > 其实都是为主从复制的一致性和数据恢复做的保障

* `log_bin_use_v1_row_events`：如果为0，则表示正在使用版本2的binlog，否则为版本1的binlog
* `sql_log_bin`：控制当前会话是否可以向binlog中写入日志



MySQL服务器中提供了多种格式来记录binlog，具体格式及特点如下：

* `STATEMENT`：基于SQL语句的日志记录，记录的是SQL语句，对数据进行修改的SQL都会记录在日志文件中
  * 易读性高、节省空间，但是某些SQL语句的执行结果可能受到环境和状态的影响（例如`NOW()、UUID()`），因此在一些特定场景下可能会引发非确定性问题
* `ROW`：基于行的日志记录，记录的是每一行的数据变更(默认)
  * 更精确、避免了非确定性问题，但是会占用更多的内存空间
* `MIXED`：混合了`STATEMENT`和`ROW`两种格式，默认采用`STATEMENT`，在某些特殊情况下会自动切换为`ROW`进行记录



查看当前的binlog格式：

```sql
SHOW VARIABLES LIKE '%binlog_format%';
```



由于日志是以二进制方式存储的，不能直接读取，需要提高二进制日志查询工具`mysqlbinlog`来查看，具体用法：

```bash
mysqlbinlog [参数选项] logfilename

参数选项：
	-d	指定数据库名称，只列出指定的数据库相关操作
	-o	忽略掉日志中的前n行命令
	-v	将行事件重构为SQL语句
	-w	将行事件重构为SQL语句，并输出注释信息
```

> 试了半天，原来是直接在root下执行就可以，不用连接到mysql



对于比较繁忙的业务系统，生成的binlog数据量很大，如果长时间不清除，将会占用大量的磁盘空间。可以通过以下几种方式来清理：

* `reset master`：删除全部binlog日志，删除之后，日志编号将从binlog.000001重新开始
* `purge master logs to 'binlog.******'`：删除`******`编号之前的所有日志
* `purge master logs before 'yyyy-mm-dd hh24:mi:ss'`：删除日志为`yyyy-mm-dd hh24:mi:ss`之前产生的所有日志

也可以在MySQL的配置文件中配置binlog的过期时间，过期自动删除：

```sql
SHOW VARIABLES LIKE '%binlog_expire_logs_seconds%';
```



## 查询日志

查询日志中记录了客户端的**所有操作语句**，而binlog不包含查询数据的SQL语句。默认情况下，查询日志是未开启的。查询相关参数：

```sql
SHOW VARIABLES LIKE '%general%';
```

![image-20240318214628657](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240318214628657.png)



可以通过修改全局变量的方式来配置查询日志：

```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '...';
```



## 慢查询日志

慢查询日志记录了所有执行时间超过参数`long_query_time`并且扫描记录不小于`min_examined_row_limit`的所有SQL语句的日志，默认未开启。`long_query_time`默认为10秒，最小为0，精度可以到微妙。`min_examined_row_limit`默认值为0

```sql
# 开启慢查询日志
SET GLOBAL slow_query_log = 1;
# 设置时间
SET GLOBAL long_query_time = 2;
```



默认情况下，不会记录管理语句，也不会记录不使用索引查询的语句。可以使用`log_slow_admin_statements`和`log_queries_not_using_indexes`来更改此行为：

```sql
# 记录执行较慢的管理语句
SET GLOBAL log_slow_admin_statements = 1;
# 记录执行较慢的未使用索引的语句
SET GLOBAL log_queries_not_using_indexes = 1;
```

