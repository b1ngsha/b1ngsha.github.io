---
title: MySQL主从复制
date: 2024-03-19 13:46:27
tags: 
- MySQL
- 主从复制
categories: MySQL
---
## 概述

主从复制是指将主数据库的DDL和DML操作通过binlog传到从库服务器中，然后在从库上对这些日志重新执行（也叫重做），从而使得从库和主库的数据保持同步。

MySQL支持一台主库同时向多台从库进行复制，从库同时也可以作为其他从服务器的主库，实现链状复制。

MySQL复制的优点主要包含以下三个方面：

1. 主库出现问题时，可以快速地切换到从库提供服务
2. 实现读写分离，降低主库的访问压力
3. 可以在从库中执行备份，以避免备份期间影响主库服务（备份会加全局锁并阻塞写操作）



## 原理

![image-20240319103539602](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240319103539602.png)

1. 主库在事务提交时，会把数据变更记录在binlog中
2. 从库读取主库的binlog文件，写入到从库的中继日志（Relay Log）
3. 从库回放中继日志中的事件，生成它自己的数据



## 搭建

首先需要准备两台服务器，一台作为主库，一台作为从库

### 主库配置

开放3306端口：

```bash
firewall-cmd --zone=public --add-port=3306/tcp -permanent
firewall-cmd -reload
```



或者直接关闭防火墙：

```bash
systemctl stop firewalld
systemctl disable firewalld
```



修改配置文件 /etc/my.cnf：

```bash
# mysql服务id，保证在整个集群环境中唯一
server-id = 1
# 是否只读，1代表只读，0代表读写
read-only = 0
# 设置不需要进行同步的数据库
# binlog-ignore-db = xxx
# 指定需要同步的数据库
# binlog-do-db = db01
```



重启MySQL服务器：

```bash
systemctl restart mysqld
```



登录MySQL，创建远程连接的账号，并授予主从复制的权限

```sql
CREATE USER 'user'@'%' IDENTIFIED WITH mysql_native_password BY 'Root@123456';

GRANT REPLICATION SLAVE ON *.* TO 'user'@'%';
```



查看binlog坐标

```sql
SHOW MASTER STATUS;
```

![image-20240319111847242](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240319111847242.png)

* `File`: 从哪个文件开始进行推送
* `Position`：从文件的哪个位置开始推送
* `Binlog_Do_DB`：需要同步的数据库
* `Bin_Ignore_DB`：不需要同步的数据库
* `Executed_Gtid_Set`：从库以及执行的事务编号



### 从库配置

修改配置文件 /etc/my.cnf

```bash
server-id = 2
read-only = 1
```

> 这里将`read-only`设置为只读是将普通用户设置为只读的，如果用户有超级用户的权限其实依旧可以进行读写操作。
>
> 如果要将超级用户的权限也设置为只读的，设置`super-read-only=1`即可



重启MySQL服务

```bash
systemctl restart mysqld
```



登录mysql，设置主库配置

```sql
CHANGE REPLICATION SOURCE TO SOURCE_HOST='xxx.xxx', SOURCE_USER='xxx', SOURCE_PASSWORD = 'xxx', SOURCE_LOG_FILE = 'xxx', SOURCE_LOG_POS = xxx;
```

* `SOURCE_HOST`：主库IP地址
* `SOURCE_USER`：主库分配的用户名
* `SOURCE_PASSWORD`：用户名对应的密码
* `SOURCE_LOG_FILE`：开始同步的binlog日志文件名
* `SOURCE_LOG_POS`：binlog日志开始同步的位置



开启同步操作：

```sql
START REPLICA;
```



查看从库中主从复制的状态：

```sql
SHOW REPLICA STATUS;
```

