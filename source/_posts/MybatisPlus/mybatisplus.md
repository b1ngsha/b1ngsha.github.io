---
title: 初探MybatisPlus
date: 2024-03-21 11:34:09
categories: MybatisPlus
tags: MybatisPlus
---

写在前面：

> 一天速通了一下，感觉还是很好用的，比Mybatis方便的同时多封装了很多功能

# 快速入门

## 使用步骤

1. 引入MybatisPlus依赖

   ```xml
   <dependency>
       <groupId>com.baomidou</groupId>
       <artifactId>mybatis-plus-boot-starter</artifactId>
       <version>最新版本</version>
   </dependency>
   ```

2. 自定义的Mapper继承MybatisPlus提供的`BaseMapper`接口

   ```java
   public interface UserMapper extends BaseMapper<User> {
       
   }
   ```



至此，就可以直接使用`UserMapper`对User表进行单表的CRUD操作



## 常见注解

MybatisPlus通过扫描实体类，并基于反射来获取实体类信息作为数据库表信息

对实体类 -> 数据库表的映射关系做了以下的约定：

* 类名驼峰转下划线作为表名
* 名为id的字段作为主键
* 变量名驼峰转下划线作为表的字段名



如果出现不符合约定的情况，则需要使用注解来手动指定映射关系：

* `@TableName`：指定数据库表名

* `@TableId`：指定表中的主键字段信息

  * `IdType`枚举：
    * `AUTO`：数据库自增
    * `INPUT`：通过set方法由程序员手动输入
    * `ASSIGN_ID`：自动分配ID，调用接口`IdentifierGenerator`的方法`nextId`来生成id，默认实现为`DefaultIdentifierGenerator`雪花算法

* `@TableField`：指定表中的普通字段信息

  * **这里有一点需要注意，当成员变量为布尔类型并且名称为`isXxx`时，反射得到的结果会变成`Xxx`，因此需要手动指定**

    ![image-20240320112904495](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/image-20240320112904495.png)

  * 当成员变量名与数据库关键字冲突时，需要手动指定。例如给`order`成员变量添加注解==@TableFiled(&#96;order&#96;)==

  * 当成员变量不是数据库字段时，需要添加主注解`@TableField(exist = false)`



# 核心功能

## 条件构造器

根据需要拼装`QueryWapper/UpdateWrapper/LambdaQueryWrapper/LambdaUpdateWrapper`即可

例如需要更新id为1，2，4的用户的余额，减去200元

```java
@Test
void testUpdateWrapper() {
    List<Long> ids = List.of(1L, 2L, 4L);
    UpdateWrapper<User> wrapper = new UpdateWrapper<User>()
        .setSql("balance = balance - 200")
        .in("id", ids);
    userMapper.update(null, wrapper);
}
```

这种写法虽然可以满足需求，但是将SQL语句暴露在了业务层，不符合开发规范。因此引入自定义SQL的方式解决这个问题



## 自定义SQL

可以利用`Wrapper`来构造复杂的`where`条件，然后自己定义SQL语句中剩下的部分

1. 基于`Wrapper`构造`where`条件

   ```java
   @Test
   void testUpdateWrapper() {
       List<Long> ids = List.of(1L, 2L, 4L);
       int amount = 200;
       UpdateWrapper<User> wrapper = new UpdateWrapper<User>()
           .in("id", ids);
       userMapper.updateBalanceByIds(wrapper, amount);
   }
   ```

2. 在`mapper`方法参数中用`@Param`注解声明`wrapper`变量名称，必须是`ew`

   ```java
   void updateBalanceByIds(@Param("ew") QueryMapper<User> wrapper, @Param("amount") int amount);
   ```

3. 自定义SQL，并使用`Wrapper`条件

   ```xml
   <update id="updateBalanceByIds">
   	UPDATE tb_user SET balance = balance - #{amount} ${ew.customSqlSegment}
   </update>
   ```

   

## IService接口

基本用法：

* 自定义`Service`接口继承`IService`接口

  ```java
  public interface IUserService extends IService<User> {}
  ```

* 自定义`Service`实现类，实现自定义接口并继承`ServiceImpl`类

  ```java
  public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {}
  ```

  

批量插入性能分析：

1. **逐条插入**

   ```java
   void testSaveOneByOne() {
       long b = System.currentTimeMillis();
       for (int i = 1; i <= 100000; i++) {
           userService.save(buildUser(i));
       }
       long e = System.currentTimeMillis();
       System.out.println("耗时：" + (e - b));
   }
   ```

   这种方式是最耗时的，因为每插入一次就要发起一次网络请求，而网络IO请求是非常耗时的

2. **批量插入**

   ```java
   void testSaveBatch() {
       List<User> list = new ArrayList<>(1000);
       long b = System.currentTimeMillis();
       for (int i = 1; i <= 100000; i++) {
           list.add(buildUser(i));
           if (i % 1000 == 0) {
               userService.saveBatch(list);
               list.clear();
           }
       }
       long e = System.currentTimeMillis();
       System.out.println("耗时: " + (e - b));
   }
   ```

   采用的是JDBC中的预编译方案，先将提交的数据变成SQL语句，而不是直接提交到数据库。在以上的例子中就是将1000条SQL语句打包后再一次性提交到MySQL，等于是只有100次网络请求。但是由于打包SQL语句之后数据库还是逐条执行SQL的，因此性能还是有一定影响

3. **整合SQL语句**

   最好的方式其实是把SQL语句整合成一句，像这样的形式：

   ```sql
   INSERT INTO 
   	tb_user(xxx, xxx, xxx)
   VALUES
   	(xxx, xxx, xxx),
       (xxx, xxx, xxx),
       (xxx, xxx, xxx),
       (xxx, xxx, xxx);
   ```

   只需要添加MySQL参数`rewriteBatchedStatements=true`即可（在连接数据库的url后面追加，例如`http://localhost:3306/mp?useUnicode=true&rewriteBatchedStatements=true`）。MySQL驱动会将在MybatisPlus中调用`saveBatch`生成的一条条SQL语句进行整合，从而大大提高执行速度



# 扩展功能

## DB静态工具

在项目中可能会出现这样的场景：多个Service之间互相调用，如果使用传统的`@Autowired`进行注入就会产生循环依赖的问题，在这种场景下可以采用`DB`静态工具来解决这个问题



## 逻辑删除

**逻辑删除**就是基于代码逻辑模拟删除效果，但并不会真正删除数据。思路如下：

* 在表中添加一个字段标记数据是否被删除
* 当删除数据时把标记置为1
* 查询时只查询标记为0的数据



MybatisPlus提供了逻辑删除功能，无需改变方法调用的方式，而是在底层帮我们自动修改CRUD语句，我们要做的就是在`application.yml`文件中配置逻辑删除的字段名称和值即可：

```yaml
mybatis-plus:
	global-config:
		db-config:
			logic-delete-field: flag # 全局逻辑删除的实体字段名
			logic-delete-value: 1 # 逻辑已删除值
			logic-not-delete-value: 0 # 逻辑未删除值
```



==注意==

逻辑删除本身也有自己的问题，比如：

* 会导致数据库表中垃圾数据越来越多，影响查询效率
* SQL中全都需要对逻辑删除字段做判断，影响查询效率

因此，可以采用将数据迁移到其他表的方法



## 枚举处理器

在数据库表中经常会有一些表示状态的字段，例如status字段，为1表示正常，为2表示冻结。在程序中如果也用一个Integer类型的字段去映射的话，当状态很多的时候就很难记忆，并且用数字进行判断的方式也会使得代码的可读性降低

因此为了解决上述问题，可以在程序中采用**枚举**的方式来表示这种状态，但是这种方式会带来一些问题，如何将数据库表中的数字字段映射到枚举类呢？

MybatisPlus中提供了一种枚举处理器来解决这个问题：

1. 给枚举中的与数据库对应的value值添加`@EnumValue`注解，表示数据库中的字段与枚举类中的哪个成员变量相对应

   ```java
   public enum UserStatus {
       NORMAL(1, "正常"),
       FROZEN(2, "冻结")
       ;
       
       @EnumValue
       private final int value;
       private final String desc;
       
       UserStatus(int value, String desc) {
           this.value = value;
           this.desc = desc;
       }
   }
   ```

2. 在配置文件中配置统一的枚举处理器，实现类型转换

   ```yaml
   mybatis-plus:
   	configuration:
   		default-enum-type-handler: com.baomidou.mybatisplus.core.handlers.MybatisEnumTypeHandler
   ```

   

## JSON处理器

MybatisPlus提供了JSON处理器来映射数据库表中的JSON字段到Java中的实体类

1. 根据JSON字段中的属性创建实体类

2. 在该实体类的成员变量上添加注解`@TableField(typeHandler = JacksonTypeHandler.class)`

   ```java
   @Data
   public class User {
       private Long id;
       private String username;
       @TableField(typeHandler = JacksonTypeHandler.class)
       private UserInfo info;
   }
   ```

3. 在该实体类成员变量的所属类的`@TableName`注解中添加`autoResultMap = true`

   ```java
   @Data
   @TableName(value = "user", autoResultMap = true)
   public class User {
       ...
   }
   ```

   

## 分页插件

在做分页查询时，可以使用`PageHelper`，也可以使用MybatisPlus提供的分页插件

首先，要在配置类中注册MybatisPlus的核心插件，同时添加分页插件：

```java
@Configuration
public class MybatisConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        // 1. 初始化核心插件
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // 2. 添加分页插件
        PaginationInnerInterceptor pageInterceptor = new PaginationInnerInterceptor(DbType.MYSQL);
        pageInterceptor.setMaxLimit(1000L); // 设置分页上限
        interceptor.addInnerInterceptor(pageInterceptor);
        return interceptor;
    }
}
```



接着就可以使用分页的API了

```java
@Test
void testPageQuery() {
    int pageNo = 1, pageSize = 5;
    // 设置分页参数
    Page<User> page = Page.of(pageNo, pageSize);
    // 设置排序参数
    page.addOrder(new OrderItem("balance", false));
    // 分页查询(这里其实不用一个新的变量去接收也可以，其实就是把结果set到了page中)
    Page<User> p = userService.page(page);
    // 总条数
    System.out.println("total = " + p.getTotal());
    // 总页数
    System.out.println("pages = " + p.getPages());
    // 分页数据
    List<User> records = p.getRecords();
    records.forEach(System.out::println);
}
```

