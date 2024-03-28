---
title: 初探Docker
date: 2024-03-21 21:06:00
tags: Docker
categories: Docker
---
# 快速入门

## 部署MySQL

执行下面的命令即可运行MySQL：

```shell
docker run -d \
  --name mysql \
  -p 3306:3306 \
  -e TZ=Asia/Shanghai \
  -e MYSQL_ROOT_PASSWORD=123 \
  mysql
```

<!--more-->

* `docker run`：创建并运行一个容器，`-d`是让容器在后台运行
* `--name mysql`：给容器起一个名字，必须唯一
* `-p 3306:3306`：设置端口映射
  * 在每个容器的内部其实都类似一个小的服务器，有自己的IP地址、端口号等信息，而这些信息是被宿主机隔离的，无法直接访问，因此可以将内部的端口号映射到外部宿主机的端口上来进行访问
  * 前面的是宿主机端口，后面的是内部容器的端口
* `-e KEY=VALUE`：设置环境变量
  * 有些镜像文件会对环境变量的配置有要求，按需填写即可
* `mysql`：运行的镜像的名字
  * 镜像的名称一般分两部分组成：`[repository]:[tag]`
    * 其中`repository`是镜像名
    * `tag`是镜像的版本
  * 如果只写`repository`的话，就会直接获取最新版本



如果docker中未安装MySQL镜像，则会自动进行安装并运行

运行起来后，就可以用数据库管理工具进行连接：

![image-20240321154756058](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321154756058.png)



## 镜像和容器

当我们利用Docker安装应用时，Docker会自动搜索并下载应用**镜像（image）**。镜像不仅包含应用本身，还包含应用运行所需要的环境、配置、系统函数库。Docker会在运行镜像时创建一个隔离环境，称为**容器（container）**

**镜像仓库**：存储和管理镜像的平台，Docker官方维护了一个公共仓库

![image-20240321155017469](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321155017469.png)



# Docker基础

## 常见命令

![image-20240321162317135](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321162317135.png)



## 数据卷挂载

由于容器内没有提供像`vi`这样的编辑器，只是包含了一些必备的环境变量和文件，因此很难直接对容器内的文件进行修改。Docker提供了数据卷来应对这种情况，数据卷是一个虚拟目录，它将宿主机目录映射到容器内目录，方便我们操作容器内文件，或者方便迁移容器产生的数据

![image-20240321172025725](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321172025725.png)



在创建容器时，添加一个参数`-v 数据卷名:容器内目录`完成挂载

容器创建时，如果发现挂载的数据不存在，会自动创建



常见命令：

* `docker volume ls`：查看数据卷
* `docker volumn rm`：删除数据卷
* `docker volumn inspect`：查看数据卷详情
* `docker volumn prune`：删除未使用的数据卷



## 本地目录挂载

在创建容器时，其实会自动创建一个数据卷，这个数据卷是以随机字符串命名的，被称为匿名数据卷。例如在创建一个MySQL容器时，会产生一个数据卷来保存MySQL中的数据。但是生成的匿名数据卷目录很深，不易于操作。并且如果容器被删除后，不易将旧的数据卷进行迁移

因此可以采用**本地目录挂载**的方式，在创建容器时将指定的容器内部的数据挂载到本机目录下，如果需要迁移则进行复用即可



在执行`docker run`命令时，使用`-v 本地目录:容器内目录`的方式可以完成本地目录挂载

本地目录必须以 "/" 或者 "./" 开头，如果直接以名称开头，会被识别为数据卷而非本地目录



## 自定义镜像

镜像就是包含了应用程序、程序运行的系统函数库、运行配置等文件的文件包。构建镜像的过程其实就是把上述文件打包的过程

在镜像中，上述文件是采用**层**的方式来组织的，这样可以很好地复用一些基础层，避免重复下载

![image-20240321195757070](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321195757070.png)



构建自定义镜像采用Dockerfile进行创建。**Dockerfile**是一个文本文件，其中包含一个个的**指令**，用指令来说明要执行什么操作来构建镜像。将来Docker就可以根据Dockerfile来帮我们构建镜像。常见指令如下：

| 指令       | 说明                                         | 示例                                                         |
| ---------- | -------------------------------------------- | ------------------------------------------------------------ |
| FROM       | 指定基础镜像                                 | FROM centos:6                                                |
| ENV        | 设置环境变量，可在后面指令使用               | ENV key value                                                |
| COPY       | 拷贝本地文件到镜像的指定目录                 | COPY ./jre11.tar.gz /tmp                                     |
| RUN        | 执行Linux的shell命令，一般是安装过程的命令   | RUN tar -zxvf /tmp/jre11.tar.gz && EXPORTS path=/tmp/jre11:$path |
| EXPOSE     | 指定容器运行时监听的端口，是给镜像使用者看的 | EXPOSE 8080                                                  |
| ENTRYPOINT | 镜像中应用的启动命令，容器运行时调用         | ENTRYPOINT java -jar xx.jar                                  |



假设我们需要创建一个Java项目的镜像，可以基于Ubuntu基础镜像来进行构建：

```dockerfile
# 指定基础镜像
FROM ubuntu:16.04
# 配置环境变量，JDK的安装目录、容器内时区
ENV JAVA_DIR = /usr/local
# 拷贝jdk和java项目的包
COPY ./jdk8.tar.gz $JAVA_DIR/
COPY ./docker-demo.jar /tmp/app.jar
# 安装JDK
RUN cd $JAVA_DIR \ && tar -xf ./jdk8.tar.gz \ && mv ./jdk1.8.0_144 ./java8
# 配置环境变量
ENV JAVA_HOME = $JAVA_DIR/java8
ENV PATH = $PATH:$JAVA_HOME/bin
# 入口，java项目的启动命令
ENTRYPOINT ["java", "-jar", "/app.jar"]
```



或者直接基于JDK为基础镜像：

```dockerfile
# 基础镜像
FROM openjdk:11.0-jre-buster
# 拷贝jar包
COPY docker-demo.jar /app.jar
# 入口
ENTRYPOINT ["java", "-jar", "/app.jar"]
```



当编写好了Dockerfile，就可以利用下面的命令来构建镜像：

```bash
docker build -t myImage:1.0 .
```

* `-t`：是给镜像起名，格式依然是`repository:tag`的格式，不指定tag时，默认为latest
* `.`：是指定Dockerfile所在目录，如果就在当前目录，则指定为`.`



## 容器网络互连

在Docker中，经常出现容器之间需要互相调用服务的情况。Docker中内置了一个虚拟的网桥，在默认情况下，所有容器都是以bridge方式连接到Docker的一个虚拟网桥上：

![image-20240321203021293](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240321203021293.png)

这样虽然容器之前可以互联，但是存在一个问题：

容器的IP地址是按序分配的，例如上图中，第一个容器先启动，分配的IP就是172.17.0.2，但是如果此时重启了服务，就有可能被分配成其他的IP地址。假如这个容器是MySQL服务，在程序中是根据IP地址来进行连接的，就会出现重启服务后无法连接的情况

此时就需要引入**自定义网络**进行容器的互连，自定义网络中的容器之间可以通过**容器名**来互相访问，就避免了IP地址不唯一的问题。Docker的网络操作命令如下：

| 命令                      | 说明                     |
| ------------------------- | ------------------------ |
| docker network create     | 创建一个网络             |
| docker network ls         | 查看所有网络             |
| docker network rm         | 删除指定网络             |
| docker network prune      | 清除未使用的网络         |
| docker network connect    | 使指定容器连接加入某网络 |
| docker network disconnect | 使指定容器连接离开某网络 |
| docker network inspect    | 查看网络详细信息         |



# 项目部署

## DockerCompose

Docker Compose通过一个单独的`docker-compose.yml`模板文件（YAML格式）来定义一组相关联的应用容器，帮助我们**实现多个相互关联的Docker容器的快速部署**

```yaml
version: "3.8"
services: 
  mysql:
    image: mysql
    container_name: mysql
    ports:
      - "3306:3306"
    environment:
      TZ: Asia/Shanghai
      MYSQL_ROOT_PASSWORD: 123
    volumes:
      - "..."
      - "..."
      - "..."
    networks:
      - hmall
```



`docker compose`的命令格式如下：

```bash
docker compose [OPTIONS] [COMMAND]
```

