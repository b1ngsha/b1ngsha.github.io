---
title: go1.24.3 context源码精读
date: 2025-07-08 00:12:04
category: Golang
---

Golang标准库在1.7版本引入了context，它是goroutine的上下文，包含了goroutine的运行状态、环境等信息。context则主要用来在goroutine之间传递上下文信息，包括：取消信号、超时时间、截止时间、键值对等。

# Context是什么
在Golang的Server里，通常每个请求都会启动若干个goroutine同时进行工作：有些用于与数据库建立连接，有些用于调用接口获取数据......
![request goroutine](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708001905.png)

这些goroutine则需要共享这个请求的基本数据，例如最常见的，登录的鉴权token，处理请求的最大超时时间等等。当请求被取消或者是处理时间超过超时时间，这次请求都将被直接抛弃。这时，所有正在为这个请求工作的goroutine都需要快速退出，系统回收相关的资源。
context包就是为了解决这些问题而开发的，当一个请求衍生了很多相互关联的goroutine时，它可以用于解决这些goroutine的退出通知和数据传递等功能。

# 源码概览
接下来我们将基于go1.24.3版本来进行源码的深入分析。在进行分析之前，让我们首先从全局梳理一下Context源码的结构。其中包含接口与结构体如下：
![interfaces&structs](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002009.png)
包含函数、变量和类型如下：
![functions&variables&types](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002041.png)


# 源码剖析
## Context
接下来，我们就可以逐一进行源码的分析了。显然，源码的主干为`Context interface`，其定义如下：
```go
type Context interface {
  Deadline() (deadline time.Time, ok bool)
  Done() <-chan struct{}
  Err() error
  Value(key any) any
}

var Canceled = errors.New("context canceled")

var DeadlineExceeded error = deadlineExceededError{}

type deadlineExceededError struct{}

func (deadlineExceededError) Error() string { return "context deadline exceeded" }
func (deadlineExceededError) Timeout() bool { return true }
func (deadlineExceededError) Temporary() bool { return true }
```
在`Context`接口中，定义了四个幂等的方法：
- `Deadline`方法会返回`Context`的过期时间。
- `Done`方法会返回一个`channel`，这个`channel`会在`Context`被取消时被关闭。这是一个只读的`channel`，我们知道当读一个关闭的`channel`时会读出来相应类型的零值。因此在子协程中，除非这个`channel`已经被关闭，否则是不会读出来任何东西的。
- `Err`方法会返回一个错误。如果`Done`这个`channel`被关闭了，`Err`会返回关闭的原因。如果是因为超过截止日期，则会返回`DeadlineExceeded`，如果是除此以外的其他原因被取消，则会返回`Canceled`。
- `Value` 会获取`Context`当中的key对应的value，key不存在时则会返回nil。

## canceler
接下来看看另一个接口`canceler`。
```go
type canceler interface {
  cancel(removeFromParent bool, err, cause error)
  Done() <-chan struct{}
}
```
`canceler`是一种可以直接被取消的`Context`类型。它的实现类包括`*cancelCtx`和`*timerCtx`。

## emptyCtx
```go
type emptyCtx struct{}

func (emptyCtx) Deadline() (deadline time.Time, ok bool) {
  return
}

func (emptyCtx) Done() <-chan struct{} {
  return nil
}

func (emptyCtx) Err() error {
  return nil
}

func (emptyCtx) Value(key any) any {
  return nil
}
```
`emptyCtx`是`Context`的一个实现，也是`backgroundCtx`和`todoCtx`共同的基础。它永远不会被取消，没有值，也没有过期时间。

## backgroundCtx&todoCtx
```go
type backgroundCtx struct{ emptyCtx }

func (backgroundCtx) String() string {
  return "context.Background"
}

type todoCtx struct{ emptyCtx }

func (todoCtx) String() string {
  return "context.TODO"
}

func Background() Context {
  return backgroundCtx{}
}

func TODO() context {
  return todoCtx{}
}
```
`backgroundCtx`与`todoCtx`除了名称不同外，几乎没有任何区别，它们都属于`emptyCtx`类型。
- `Background`方法会返回一个空的`Context`，它永远不会被取消，没有值，也没有过期时间。它通常会被用在`main`方法、初始化和测试这些场景当中，作为顶层的`Context`接收请求。
- `TODO`方法同样会返回一个空的`Context`。当不清楚使用哪种`Context`，或者是在调用一个需要传递`Context`参数但没有其他`Context`可使用时，就可以使用`context.TODO`。可以理解为不知道用什么的时候就先用它“占个位置”，等到后面再换成具体的`Context`。

## cancelCtx
接下来看一个重要的`Context`：
```go
type cancelCtx struct {
  Context

  mu       sync.Mutex
  done     atomic.Value
  children map[canceler]struct{}
  err      error
  cause    error
}
```
`cancelCtx`实现了`canceler`接口，但是并没有实现`Context`接口（没有实现`Context`中的`Deadline`方法），而是将其embed到了结构体当中。可见，它必然是某个`Context`的子`Context`。它定义了以下的几个字段：
- `mu`是一把锁，用于实现对其他字段的并发控制。
- `done`实际是`chan struct{}`类型，与`Context`中的`Done`类似，用于反映`cancelContext`的生命周期（是否存活）。
- `children`是一个集合，它存放了`cancelCtx`的所有子`Context`。
- `err`记录了当前`cancelCtx`的错误。
- `cause`记录了取消操作的原因。

```go
func (c *cancelCtx) Value(key any) any {
  if key == &cancelCtxKey {
    return c
  }
  return value(c.Context, key)
}

var cancelCtxKey int
```
在`Value`方法中，判断了传入的key是否为特定的`cancelCtxKey`，如果是的话就返回`cancelCtx`自身的指针。
`cancelCtxKey`被定义出来的目的就是为了定制化一个能够直接返回`cancelCtx`自身的key，实现对`cancelCtx`类型的快速判断。
如果不是这个特定的key，则会走通用的函数`value`取值返回。

```go
func (c *cancelCtx) Done() <-chan struct{} {
  d := c.done.Load()
  if d != nil {
    return d.(chan struct{})
  }
  c.mu.Lock()
  defer c.mu.Unlock()
  d = c.done.Load()
  if d == nil {
    d = make(chan struct{})
    c.done.Store(d)
  }
  return d.(chan struct{})
}
```
`Done`方法的执行流程如下图所示：
![Done执行流程](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002131.png)

- 首先会尝试读取`cancelCtx`中的`done channel`，如果已存在的话就直接返回；
- 如果不存在，则加锁检查`channel`是否存在，存在则返回。这里做了一个double-check的动作，是为了防止并发情况下在第一次检查和加锁之间这段时间进行了channel的初始化动作导致误判；
- 如果还是不存在，那就说明`channel`确实没有被创建过，就可以进行`channel`的初始化并返回。这里体现了`channel`的懒加载机制，只有当调用`Done`方法时才会去创建`channel`。

```go
func (c *cancelCtx) Err() error {
  c.mu.Lock()
  err := c.err
  c.mu.Unlock()
  return err
}
```
`Err`方法的实现就很简单了，直接加把锁去读`err`字段。

```go
func (c *cancelCtx) propagateCancel(parent Context, child canceler) {
  c.Context = parent

  done := parent.Done()
  if done == nil {
    return
  }

  select {
  case <-done:
    child.cancel(false, parent.Err(), Cause(parent))
    return
  default:
  }

  if p, ok := parentCancelCtx(parent); ok {
    p.mu.Lock()
    if p.err != nil {
      child.cancel(false, p.err, p.cause)
    } else {
      if p.children == nil {
        p.children = make(map[canceler]struct{})
      }
      p.children[child] = struct{}{}
    }
    p.mu.Unlock()
    return
  }

  if a, ok := parent.(afterFuncer); ok {
    c.mu.Lock()
    stop := a.AfterFunc(func() {
      child.cancel(false, parent.Err(), Cause(parent))
    })
    c.Context = stopCtx{
      Context: parent,
      stop:    stop,
    }
    c.mu.Unlock()
    return
  }

  goroutines.Add(1)
  go func() {
    select {
    case <-parent.Done():
      child.cancel(false, parent.Err(), Cause(parent))
    case <-child.Done():
    }
  }()
}
```
`propagateCancel`方法的目的是让父`Context`被取消的同时，确保子`Context`也被取消。并且它会设置子`Conext`的父`Context`，以便在`parent.Done`关闭的同时触发`child.cancel`。`propagateCancel`方法的执行流程如下所示：
![propagateCancel执行流程](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002211.png)

- 首先设置`parent Context`；
- 根据`parent.Done`是否为`nil`来判断`parent`是否可被取消（`emptyCtx`的`channel`为空）。如果不可被取消也就不需要给`child`设置任何机制来监听`parent`的取消信号，因此直接return；
- 判断`parent`是否为`cancelCtx`，如果是，则上锁，并判断其是否已被取消。如果是，则直接将`child`取消，如果没有，则将`child`加到`children`集合中；
- 判断`parent`是否实现了`afterFuncer`接口，如果是，则将`parent`再包裹一层为`stopCtx`，并注册一个`stop`函数。这个操作会使得在`parent`被取消时，同步执行`child`注册的回调函数，也就是将其同步取消。`stop`则可以取消这个回调函数的执行；
- 如果执行到最后，就会直接起一个goroutine监听`parent`的取消信号，在`parent`被取消时取消`child`。

> 这里让我们一起思考两个问题：
> 1. 明明在方法的最后是会起一个goroutine去监听`parent`的`channel`的，为什么还要在方法最开始的地方再做一次非阻塞式的监听呢？
> 	这里其实是做了一个优化的策略，能够**让子`Context`尽早地被取消掉**。假设我们传入的父`Context`是一个`cancelCtx`，那就可以发现代码中有三个地方能够监听到父`Context`的取消事件：
> 	1. 非阻塞式`select`
> 	2. `parentCancelCtx` case 当中的`parent.Err != nil`判断
> 	3. 最后兜底的goroutine
> 	通过这三处的判断就可以尽早地发现“父`Context`被取消”这一事件，并及时作出处理。
> 	此外，这种策略还能够更好地应对多线程下**并发执行取消动作**的情况。
> 2. 在`parentCancelCtx`这个case当中，为什么在`parent`未被取消时只做了一个将`child`加入到`parent.children`集合的动作？
> 	因为我们这个方法的本质目的是做到当父`Context`被取消的同时，确保子`Context`也会被取消。而在`parent.cancel`被调用的时候是会将`children`集合中的所有`Context`都取消掉的，因此在这里直接加入即可。

```go
func (c *cancelCtx) String() string {
  return contextName(c.Context) + ".WithCancel"
}

func contextName(c Context) string { 
  if s, ok := c.(stringer); ok {
    return s.String() 
  } 
  return reflectlite.TypeOf(c).String() 
}
```
`String`方法也很简单，调用通用的`contextName`方法获取名称，拼接字符串返回。

```go
func (c *cancelCtx) cancel(removeFromParent bool, err, cause error) {
  if err == nil {
    panic("context: internal error: missing cancel error")
  }
  if cause == nil {
    cause = err
  }
  c.mu.Lock()
  if c.err != nil {
    c.mu.Unlock()
    return
  }
  c.err = err
  c.cause = cause
  d, _ := c.done.Load().(chan struct{})
  if d == nil {
    c.done.Store(closedchan)
  } else {
    close(d)
  }
  for child := range c.children {
    child.cancel(false, err, cause)
  }
  c.children = nil
  c.mu.Unlock()

  if removeFromParent {
    removeChild(c.Context, c)
  }
}

var closedchan = make(chan struct{})
```
`cancel`是`cancelCtx`的核心方法。这个方法有三个入参，`removeFromParent`是一个bool，表示是否要将当前的`cancelCtx`从父`Context`的`children`当中删除；`err`是`cancelCtx`被取消后需要展示的错误；`cause`是`cancelCtx`被取消的原因。
`cancel`方法的执行流程如下所示：
![cancel执行流程](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002304.png)

- 首先检查参数`err`是否为空，若为空则`panic`。检查`cause`是否为空，如果为空则让传入的`err`也作为`cause`；
- 加锁；
- 检查当前的`cancelCtx`是否已经被取消了。这里检查的方式是根据`err`字段是否为空来进行判断，因为取消会将`err`字段进行非空的赋值，因此如果此时已经为非空，则说明已经被取消，解锁返回；
- 如果没有被取消，则进行取消操作：将`err`和`cause`字段赋值为传入的对应参数。对于`channel`，则判断其是否已经被初始化，如果未被初始化，则直接赋值为`closedChan`（一个可复用的已关闭的`channel`），否则直接关闭该`channel`；
- 遍历当前`cancelCtx`的子`Context`，将它们都采用相同的方式`cancel`。此时因为对于每个子`child`而言，父`Context`，也就是当前的`cancelCtx`已经被`cancel`掉了，因此传入的`removeFromParent`固定为`false`；
- 解锁；
- 根据传入的`removeFromParent`判断是否需要调用`removeChild`将当前`cancelCtx`从父`Context`的`children`中移除掉。

```go
func removeChild(parent Context, child canceler) {
  if s, ok := parent.(stopCtx); ok {
    s.stop()
    return
  }
  p, ok := parentCancelCtx(parent)
  if !ok {
    return
  }
  p.mu.Lock()
  if p.children != nil {
    delete(p.children, child)
  }
  p.mu.Unlock()
}
```
观察`removeChild`方法是如何将`cancelCtx`从父`Context`的`children`中删除的：
- 首先判断`parent`是否为`stopCtx`，如果是的话就调用它的`stop`方法并返回。这里的`stop`方法是用于取消`AfterFunc`执行的，我们注册的`AfterFunc`为`child.cancel`，而此时`child`已经被取消了，不需要重复执行；
- 如果不是，则调用`parentCancelCtx`方法判断`parent`是否为`cancelCtx`，也就是看它能不能被取消，如果不能的话就直接返回；
- 如果是，并且`parent`存在`children`，则加锁并从其中删除当前的`child`；
- 解锁返回。

```go
func parentCancelCtx(parent Context) (*cancelCtx, bool) {
	done := parent.Done()
	if done == closedchan || done == nil {
		return nil, false
	}
	p, ok := parent.Value(&cancelCtxKey).(*cancelCtx)
	if !ok {
		return nil, false
	}
	pdone, _ := p.done.Load().(chan struct{})
	if pdone != done {
		return nil, false
	}
	return p, true
}
```
`parentCancelCtx`中判断了`parent`是否为可取消的`cancelCtx`。其执行流程如下：
1. 根据`parent.Done`判断其是否不可取消`done == nil`或者已经取消`done == closedchan`，如果是的话则返回`false`；
2. 从当前`parent`开始，沿着`Context`链往上查找`cancelCtx`；
3. 如果找到，并且就是上一级的`parent`（因为这里找到的`cancelCtx`可能是更上级的），则返回`true`；

```go
type CancelFunc func()

func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
  c := withCancel(parent)
  return c, func() { c.cancel(true, Canceled, nil) }
}

func withCancel(parent Context) *cancelCtx {
  if parent == nil {
    panic("cannot create context from nil parent")
  }
  c := &cancelCtx{}
  c.propagateCancel(parent, c)
  return c
}
```
`WithCancel`方法是用于获取一个可取消的`Context`的public方法，它接收了一个`Context`作为`parent`，并会通过调用`withCancel`来初始化一个`cancelCtx`并实现对`parent`取消信号的监听。在`withCancel`内部，直接调用了`cancelCtx.propagateCancel`来实现。返回值除了创建出的`cancelCtx`外还有一个`CancelFunc`，调用它就会调用内部的`cancel`方法将创建出来的`cancelCtx`给取消掉。

```go
type CancelCauseFunc func(cause error)

func WithCancelCause(parent Context) (ctx Context, cancel CancelCauseFunc) {
  c := withCancel(parent) { c.cancel(true, Canceled, cause) }
}
```
`WithCancelCause`方法与`WithCancel`很类似，只是这里多了一个返回值`CancelCauseFunc`，让你可以传入一个`error`作为`Context`取消的原因。

```go
func Cause(c Context) error {
  if cc, ok := c.Value(&cancelCtxKey).(*cancelCtx); ok {
    cc.mu.Lock()
    defer cc.mu.Unlock()
    return cc.cause
  }
  return c.Err()
}
``` 
`Cause`方法是为了返回`Context`被取消的原因，也就是`cause`字段。但其实只有`cancelCtx`才有`cause`这个字段，更准确地说，对于用户而言，只有`WithCancelCause`创建出来的`Context`才有特定的`cause`，否则对于`cancelCtx`而言，`err`与`cause`值相同，对于其余类型的`Context`则根本不存在`cause`，直接返回`err`。

## afterFuncCtx
```go
type afterFuncCtx struct {
  cancelCtx
  once sync.Once
  f    func()
}
```
`afterFuncCtx`可以看作是对`cancelCtx`做了增强，它增加了两个字段：
- `once`用于确保并发情况下的单次执行，它会被用于实现是否运行`f`的控制；
- `f`则是一个回调函数，它会在`cancelCtx`被取消时被调用。

```go
type afterFuncer interface {
  AfterFunc(func()) func() bool
}
```
`afterFuncer`接口中包含一个函数`AfterFunc`，它会接收一个函数`f`并返回一个函数`stop`。函数 **`f`是会在`Context`被取消时调用的回调函数**，而 **`stop`则是用于取消`f`的调用的函数**。也就是说，`f`和`stop`中只有一个会被执行，这个控制的实现则依赖于`afterFuncCtx.Once`。如果一个`Context`实现了`AfterFunc`函数，则表示它会采用上述机制来进行控制。

```go
func AfterFunc(ctx Context, f func()) (stop func() bool) {
  a := &afterFuncCtx{
    f: f,
  }
  a.cancelCtx.propagateCancel(ctx, a)
  return func() bool {
    stopped := false
    a.once.Do(func() {
      stopped = true
    })
    if stopped {
      a.cancel(true, Canceled, nil)
    }
    return stopped
  }
}
```
`AfterFunc`是一个public函数，它会将传入的`Context`参数作为`parent`，`f`作为回调函数，并基于此实例化一个`afterFuncCtx`。这个`afterFuncCtx`会监听`ctx`的取消信号。返回值是一个`stop`函数，在这个方法内部它会与`f`进行`once`锁的争抢，如果获取成功则会继续执行，调用`afterFuncCtx.cancel`方法，并返回true；如果返回了false，则说明`f`函数会被执行。

```go
func (a *afterFuncCtx) cancel(removeFromParent bool, err, cause error) {
  a.cancelCtx.cancel(false, err, cause)
  if removeFromParent {
    removeChild(a.Context, a)
  }
  a.Once.Do(func() {
    go a.f()
  })
}
```
可以看到，在`afterFuncCtx.cancel`当中，实际上与`cancelCtx`的取消方式是类似的。只是它在最后会尝试去获取`Once`锁，如果获取成功则会起一个goroutine去执行`f`回调函数。

```go
type stopCtx struct {
  Content
  stop func() bool
}
```
当父上下文注册了`AfterFunc`时，`stopCtx`会被用作`cancelCtx`的父上下文。它包含了用于取消`AfterFunc`方法执行的`stop`方法。

## withoutCancelCtx
```go
func WithoutCancel(parent Context) Context {
  if parent == nil {
    panic("cannot create context from nil parent")
  }
  return withoutCancelCtx{parent}
}

type withoutCancelCtx struct {
  c Context
}

func (withoutCancelCtx) Deadline() (deadline time.Time, ok bool) {
  return
}

func (withoutCancelCtx) Done() <-chan struct{} {
  return nil
}

func (withoutCancelCtx) Err() error {
  return nil
}

func (c withoutCancelCtx) Value(key any) any {
  return value(c, key)
}

func (c withoutCancelCtx) String() string {
  return contextName(c.c) + ".WithoutCancel"
}
```
`withoutCancelCtx`在`parent`被取消时，它也不会被取消。它没有`Deadline`和`Err`，`Done channel`也是`nil`，并且对这个`Context`调用`Cause`也同样会返回`nil`。
这也就意味着，它可以用于当`parent`被取消时，执行一些额外的处理逻辑。

## timerCtx
```go
type timerCtx struct {
  cancelCtx
  timer *time.Timer

  deadline time.Time
}
```
`timerCtx`包含一个`timer`和一个`deadline`，这个`timer`会被`cancelCtx.mu`管理。它`embed`了一个`cancelCtx`用于实现`Done`和`Err`方法，并且通过停止`timer`和调用`cancelCtx.cancel`来实现取消。

```go
func (c *timerCtx) Deadline() (deadline time.Time, ok bool) {
  return c.deadline, true
}

func (c *timerCtx) String() string {
  return contextName(c.cancelCtx.Context) + ".WithDeadline(" + 
    c.deadline.String() + " [" +
    time.Until(c.deadline).String() + "])"
}
```
`Deadline`和`String`的实现都比较简单，不再赘述。

```go
func (c *timerCtx) cancel(removeFromParent bool, err, cause error) {
  c.cancelCtx.cancel(false, err, cause)
  if removeFromParent {
    removeChild(c.cancelCtx.Context, c)
  }
  c.mu.Lock()
  if c.timer != nil {
    c.timer.Stop()
    c.timer = nil
  }
  c.mu.Unlock()
}
```
在`cancel`方法中，直接通过调用内部`cancelCtx`的`cancel`方法来完成取消，并同时停止了内部的`timer`计时器。注意这里在停止`timer`的时候使用了`mu`来进行并发控制。
那这个`timer`里保存的是什么，它会做什么，又是在哪里初始化的呢？让我们接着往下看。

```go
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc) {
  return WithDeadlineCause(parent, d, nil)
}

func WithDeadlineCause(parent Context, d time.Time, cause error) (Context, CancelFunc) {
  if parent == nil {
    panic("cannot create context from nil parent")
  }
  if cur, ok := parent.Deadline(); ok && cur.Before(d) {
    return WithCancel(parent)
  }
  c := &timerCtx{
    deadline: d,
  }
  c.cancelCtx.propagateCancel(parent, c)
  dur := time.Until(d)
  if dur <= 0 {
    c.cancel(true, DeadlineExceeded, cause)
    return c, func() { c.cancel(false, Canceled, nil) }
  }
  c.mu.Lock()
  defer c.mu.Unlock()
  if c.err == nil {
    c.timer = time.AfterFunc(dur, func() {
      c.cancel(true, DeadlineExceeded, cause)
    })
  }
  return c, func() { c.cancel(true, Canceled, nil) }
}
```
这里有两个公开的方法，都可以用于初始化一个`timerCtx`，只是其中一个可以自定义`Cause`，一个不可以。
对于这个`timerCtx`而言，如果它的`parent`的`deadline`已经比传入的`d`要早了，那么就会使用相同的`deadline`。当`dealine`超过、返回的`cancelFunc`被调用或是`parent`的`Done channel`被关闭时，这个`timerCtx`的`Done channel`也会被关闭。
`WithDeadlineCause`方法的执行流程如下所示：
![WithDeadlineCause 执行流程](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250708002357.png)

1. 参数检查；
2. 检查`parent`的`dealine`是否比传入的`d`更早，如果是的话就直接返回一个`WithCancel(parent)`。因为不可能存在`parent`还存在但是`child`已经被取消的情况，所以这里的返回相当于沿用了`parent`的`deadline`；
3. 初始化一个`stopCtx`并对其进行监听；
4. 检查传入的`deadline`是否已经超过，如果是的话就直接取消刚创建出来的`stopCtx`，并且返回；
5. 如果没有，就上锁，并利用`timer`计时器进行超时回调函数的注册。这里的回调函数也就是会将创建的`stopCtx`进行取消；
6. 返回。
注意这里不同分支返回的`CancelFunc`语义不尽相同，可以联系上下文来进行理解。

```go
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc) {
  return WithDeadline(parent, time.Now().Add(timeout))
}

func WithTimeoutCause(parent Context, timeout time.Duration, cause error) (Context, CancelFunc) {
  return WithDeadlineCause(parent, time.Now().Add(timeout), cause)
}
```
`WithTimout`方法比较简单，就是将`timeout`转为`deadline`后调用`WithDeadline`。

## valueCtx
```go
type valueCtx struct {
  Context
  key, val any
}
```
`valueCtx`当中包含了一个键值对，它会为这个`key`实现一个`Value`方法，并且将其他的方法调用透传到内部的`Context`。

```go
func (c *valueCtx) Value(key any) any {
  if c.key == key {
    return c.val
  }
  return value(c.Context, key)
}
```
可以看到，在`valueCtx`的`Value`方法中，其实也就是做了一下特判，当key为`valueCtx`中的key时，返回对应存储的`value`，否则调用`value`方法进行查找。

```go
func value(c Context, key any) any {
  for {
    switch ctx := c.(type) {
    case *valueCtx:
      if key == ctx.key {
        return ctx.val
      }
      c = ctx.Content
    }
    case *cancelCtx:
      if key == &cancelCtxKey {
        return c
      }
      c = ctx.Content
    case withoutCancelCtx:
      if key == &cancelCtxKey {
        return nil
      }
      c = ctx.c
    case *timerCtx:
      if key == &cancelCtxKey {
        return &ctx.cancelCtx
      }
      c = ctx.Context
    case backgroundCtx, todoCtx:
      return nil
    default:
      return c.Value(key)
  }
}
```
可以看到，`value`中采用了循环的方式，以当前的`Context`作为起点不断向上寻找。其中`valueCtx`等类型对应存在不同的特殊处理方式。

```go
func WithValue(parent Context, key, val any) Context {
  if parent == nil {
    panic("cannot create context from nil parent")
  }
  if key == nil {
    panic("nil key")
  }
  if !reflectlite.TypeOf(key).Comparable() {
    panic("key is not comparable")
  }
  return &valueCtx{parent, key, val}
}
```
`WithValue`方法会根据传入的参数初始化一个`valueCtx`，但在文档当中对`key`提出了一些要求：
1. 它必须是非空且可比较的；
2. `key`不应该为`string`或者是任何其他的内置类型，以避免使用`Context`的包之间发生冲突，使用`WithValue`的用户应该为`key`定义自己的类型；
3. 为了避免在给接口赋值时进行内存分配，`key`通常需要有具体的类型`struct{}`；或者是在导出`context key`时，它的类型应该是指针或者接口。

那为什么要提出这些要求呢？它们是为了解决什么问题？
1. 对于第一点而言比较容易理解，因为在`valueCtx.Value`当中对`key`的判断直接采用了`==`的方式，因此字段必须是可比较的；
2. 不使用内置类型是为了避免冲突。想象这样一个场景：在`package A`当中初始化了一个`ctx = WithValue(ctx, "userID", 123)`，然后在`package B`当中初始化了另一个`ctx = WithValue(ctx, "userID", 234)`。因为`Value`是由下到上（子->父）进行查询的，因此此时`userID`就会被后来的所覆盖，造成冲突。而如果给`key`自定义一个类型，那就能保证其唯一性，避免这种冲突的发生；
3. 当一个具体的类型赋值给一个接口时，可能会发生内存分配，而对于`struct{}`而言，它是一个特殊类型，不会占用任何存储空间；或者直接将`key`定义为指针或接口类型也能减少内存的占用。但是对于接口这种类型而言，需要确保传入的具体值是唯一且可比较的。

```go
func stringify(v any) string {
  switch s := v.(type) {
  case stringer:
    return s.String()
  case string:
    return s
  case nil:
    return "<nil>"
  }
  return reflectlite.TypeOf(v).String()
}

func (c *valueCtx) String() string {
  return contextName(c.Context) + ".WithValue(" +
    stringify(c.key) + ", " + 
    stringify(c.val) + ")"
}
```
由于不想对`unicode`产生依赖，因此这里实现的`stringify`方法没有使用`fmt`，而是直接采用了`reflect`的方式来获取字符串。