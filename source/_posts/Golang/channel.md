---
title: go1.24.4 channel 源码精读
date: 2025-08-05 09:22:16
tags: Golang
---

# channel 是什么
Go语言当中的并发模型是 CSP（Communicating Sequential Processes），提倡通过通信共享内存而不是通过共享内存而实现通信。
如果说 goroutine 是 Go 程序并发的执行体，channel 就是它们之间的连接。channel 是可以让一个 goroutine 发送特定值到另一个 goroutine 的通信机制。
Go 语言中的通道（channel）是一种特殊的类型。通道像一个传送带或者队列，总是遵循先入先出（First In First Out）的规则，保证收发数据的顺序。每一个通道都是一个具体类型的导管，也就是声明 channel 的时候需要为其指定元素类型。

# 源码概览
接下来我们将基于go1.24.4版本来进行源码的深入分析，源码路径为 `go1.24.4/src/runtime/chan.go`。在开始分析之前，让我们首先从全局梳理一下channel源码的结构。包含结构体如下：
![structs](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/CleanShot%202025-07-12%20at%2014.23.22@2x.png)
包含函数和常量如下：
![functions&constants](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/images/20250712153117.png)
代码结构还是很清晰的，没有太复杂的结构体关系。

可以看到，有几个函数都是以`reflect`来作为开头，并且它们都有`go:linkname`这样的注释，例如：
```go
//go:linkname reflect_makechan reflect.makechan
func reflect_makechan(t *chantype, size int) *hchan {
    return makechan(t, size)
}
```
那这个`go:linkname`有什么用呢？其实它是一个给 Go 编译器的指令。**它的主要作用是在两个包之间建立一个符号链接，使得一个包可以访问另一个包中的私有函数或变量**。
也就是说，这里将`runtime.reflect_makechan`与`reflect.makechan`链接起来，当在调用`reflect.makechan`时，实际上执行的就是`runtime.reflect_makechan`。`go:linkname`允许用户绕过成员可见性限制。

# 源码剖析
## 核心数据结构
### hchan
```go
type hchan struct {
    qcount   uint // total data in the queue
    dataqsiz uint // size of the circular queue
    buf      unsafe.Pointer // points to an array of dataqsiz elements
    elemsize uint16
    synctest bool // true if created in a synctest bubble
    closed   uint32
    timer    *timer // timer feeding this chan
    elemtype *_type // element type
    sendx    uint // send index
    recvx    uint // receive index
    recvq    waitq // list of recv waiters
    sendq    waitq // list of send waiters

    // lock protects all fields in hchan, as well as several
    // fields in sudogs blocked on this channel.
    // 
    // Do not change another G's status while holding this lock
    // (in particular, do not ready a G), as this can deadlock
    // with stack shrinking.
    lock mutex
}
```
`hchan`结构体是 Go 语言中 channel 的运行时内部表现
- qcount：当前 channel 剩余的元素个数
- dataqsize：环形队列的长度，即 channel 的容量
- buf：指向长度为 dataqsize 的数组，即环形队列的底层存储
- elemsize：每个元素的大小
- synctest：用于同步测试
- closed：标识channel 是否关闭
- timer：为 channel 提供数据的定时器
- elemtype：channel 中元素的类型
- sendx：环形队列中发送操作的索引
- recvx：环形队列中接收操作的索引
- recvq：等待接收的 goroutine 队列
- sendq：等待发送的 goroutine 队列
- lock：保护 `hchan` 所有字段的互斥锁

### waitq
```go
type waitq struct {
    first *sudog
    last  *sudog
}
```
`waitq`中包含`first`和`last`两个指向`sudog`的指针，它本身是一个`sudog`队列。

### chantype
`chantype`并不是一个在 Go 源代码中用`type`关键字定义的具体结构体。它是由编译器在编译期间内部构建的一个类型信息结构，用来描述 channel 的元数据。

### g
```go
type g struct {
    ...
}
```
`g`是goroutine 的内部表示（定义在`src/runtime/runtime2.go`文件中，字段太多，不在此处一一列举），可以把`g`理解为一个 goroutine 的所有状态的集合，就像操作系统中的 PCB 和 TCB 一样。

### sudog
```go
type sudog struct {
    // The following fields are protected by the hchan.lock of the
    // channel this sudog is blocking on. shrinkstack depends on
    // this for sudogs involved in channel ops.
    
    g *g
    
    next *sudog
    prev *sudog
    elem unsafe.Pointer // data element (may point to stack)

    // isSelect indicates g is participating in a select, so
    // g.selectDone must be CAS'd to win the wake-up race.
    isSelect bool
    
    c *hchan // channel
}
```
`sudog`是"sudo-g"的缩写，作用是代表一个在同步对象上（如 channel 或 mutex）阻塞的 goroutine（它的结构体定义也在`src/runtime/runtime2.go`文件中）。它与`g`是多对多的关系。
当一个 goroutine 需要在 channel 上发送或接收数据，但操作无法立即完成时（例如，向一个满了的 channel 发送，或从一个空的 channel 接收），runtime 不会把整个庞大的`g`结构体放入 channel 的等待队列，这样做既浪费空间，也增加了管理的复杂性。取而代之的是，runtime 会创建一个轻量级的`sudog`结构体。
- g：goroutine
- next：队列中的下一个节点
- prev：队列中的前一个节点
- elem：读取/写入 channel 的数据的容器
- isSelect：标识当前协程是否处在 select 多路复用的流程中
- c：标识与当前 sudog 交互的channel

## 构造 channel
### makechan
`makechan`函数是`make(chan T, size)`在运行时的真正实现。
```go
func makechan(t *chantype, size int) *hchan
```
从方法签名中可以看到，输入包含两个参数：
- `t *chantype`：一个由编译器传入的、描述 channel 类型的内部结构。它包含了最关键的信息：channel 元素的类型`t.Elem`
- `size int`：channel 的缓冲区容量，即调用`make`函数时传入的第二个参数
输出则是一个初始化好的、代表 channel 的运行时对象的指针。

进入函数首先进行参数校验，这部分代码确保传入的参数是有效且安全的，防止出现溢出或不符合硬件要求的内存分配。
```go
elem := t.Elem

// compiler checks this but be safe.
if elem.Size_ >= 1<<16 {
    throw("makechan: invalid channel element type")
}
if hchanSize%maxAlign != 0 || elem.Align_ > maxAlign {
    throw("makechan: bad alignment")
}
```
1. `if elem.Size_ >= 1<<16`：检查 channel 类型中每个元素的大小是否超过了`hchan`结构中`elemsize`字段的表示范围。`elemsize`是一个uint16，其最大值为2\^16-1，这个检查确保元素大小不会溢出该字段。
2. `if hchanSize%maxAlign != 0 || elem.Align_ > maxAlign`：内存对齐检查。`maxAlign`是平台支持的最大对齐值。此检查确保`hchan`结构体自身的大小是对齐的，并且元素的对其要求没有超出平台限制。
```go
mem, overflow := math.MulUintptr(elem.Size_, uintptr(size))
if overflow || mem > maxAlloc-hchanSie || size < 0 {
    panic(plainError("makechan: size out of range"))
}
```
1. `mem, overflow := ...`：计算缓冲区所需的总内存大小，`math.MulUintptr`会安全地进行乘法，并返回一个`overflow`标识。
2. `if overflow || ...`：进行内存范围检查：
	- `overflow`：乘法计算本身溢出
	- `mem > maxAlloc-hchanSize`：检查请求的内存是否过大。`maxAlloc`是 runtime 允许一次性分配的最大内存。这里用`maxAlloc-hchanSize`是因为`hchan`结构体和`buf`缓冲区是在一次分配中完成的，所以要保证总大小不受限制
	- `size < 0`：channel 的容量不能为负数

接着就进入到核心的内存分配策略，这是`makechan`最核心的部分，它根据缓冲区大小和元素类型采用了三种不同的内存分配策略，以达到最优的性能和 GC 效率。
```go
var c *hchan
switch {
case mem == 0:
    // Queue or element size is zero.
    c = (*hchan)(mallocgc(hchanSize, nil, true))
    // Race detector uses this location for synchronization.
    c.buf = c.raceaddr()
case !elem.Pointers():
    // Elements do not contain pointers.
    // Allocate hchan and buf in one call.
    c = (*hchan)(mallocgc(hchanSize+mem, nil, true))
    c.buf = add(unsafe.Pointer(c), hchanSize)
default:
    // Elements contain pointers.
    c = new(hchan)
    c.buf = mallocgc(mem, elem, true)
}
```
Case 1：无需缓冲区
- 这包含了创建无缓冲的 channel 和元素大小为 0 这两种情况。此时只会分配`hchan`结构体本身的内存，第二个参数`nil`告诉 GC 这块内存（目前）不包含任何需要扫描的指针
- `c.buf = c.raceaddr()`是一个特殊处理，因为此时没有分配`buf`，但是，race detector需要一个唯一的内存地址来进行同步事件的记录。因此，这里将`buf`指向了`hchan`内部的一个地址，为竞争检测器提供了一个“假的”缓冲区地址。
Case 2：有缓冲区但元素不含指针
- 这里一次性分配了`hchan`和`buf`所需的全部内存。并将`buf`指向了`hchan`结构体末尾的内存地址。
- 由于元素不含指针，因此也将`mallocgc`的第二个参数设置为了`nil`，将整块内存都标记为了不需扫描，GC 扫描时就可以将整块内存跳过。
Case 3：有缓冲区，且元素包含指针
- 这种情况下就会进行两次独立的内存分配：
	- `c = new(hchan)`为`hchan`结构体本身分配内存
	- `c.buf = mallocgc(mem, elem, true)`为缓冲区`buf`单独分配内存
- 这样做的目的也是为了 GC。因为`buf`中存放了包含指针的元素，GC 必须能扫描这块内存区域，通过`mallocgc`中传入`elem(*_type)`就为这块内存提供了类型信息，此时 GC 扫描时就能找到`buf`中的所有指针。如果合并分配内存，GC 的管理就会变得很复杂。

在内存分配完成后，最后对`hchan`的所有字段进行赋值。
```go
c.elemsize = uint16(elem.Size_)
c.elemtype = elem
c.dataqsiz = uint(size)
if getg().syncGroup != nil {
    c.synctest = true
}
lockInit(&c.lock, lockRankHChan)

if debugChan {
    print("makechan: chan=", c, "; elemsize=", elem.Size_, "; dataqsiz=", size, "\n")
return c
}
```

## 写流程
### chansend
这个函数实现了向一个 channel 发送数据的所有逻辑。
```go
func chansend(c *hchan, ep unsafe.Pointer, block bool, callerpc uintptr) bool
```
可以看到，输入包含以下参数：
- `c *hchan`：目标 channel 的运行时表示
- `ep unsafe.Pointer`：只想要发送的元素的内存地址。注意这里传递的是指针而不是值本身
- `block bool`：如果为`true`则代表这是一个阻塞发送，即常规的`ch <- x`；否则代表这是一个非阻塞发送，通常用于`select`语句的`case`
- `callerpc uintptr`：调用者的程序计数器，主要用于竞争检测器
返回值表示发送是否立即成功。

```go
if c == nil {
    if !block {
        return false
    }
    gopark(nil, nil, waitReasonChanSendNilChan, traceBlockForever, 2)
    throw("unreachable")
}

// ...
// Fast path: check for failed non-blocking operation without acquiring the lock.
//
// After observing that the channel is not closed, we observe that the channel is not ready for sending. Each of these observations is a single word-sized read (first c.closed and second full()).
// Because a closed channel cannot transition from 'ready for sending' to 
// 'not ready for sending', even if the channel is closed between the two observations,
// they imply a moment between the two when the channel was both not yet closed
// and not ready for sending. We behave as if we observed the channel at that moment,
// and report that the send cannot proceed.
//
// It is okay if the reads are reordered here: if we observe that the channel is not
// ready for sending and then observe that it is not closed, that implies that the
// channel wasn't closed during the first observation. However, nothing here 
// guarantees forward progress. We rely on the side effects of lock release in
// chanrecv() and closechan() to update this thread's view of c.closed and full().
if !block && c.closed == 0 && full(c) {
    return false
}
```
1. `if c == nil`，向一个`nil` channel 发送数据会造成永久阻塞。因此如果是阻塞发送，则直接调用`gopark`让当前的 goroutine 永远休眠；否则直接返回`false`。
2. `if !block && c.closed == 0 && full(c)`，这是一个性能优化，它的目标是在不加锁的情况下，快速判断一个非阻塞的发送操作是否会失败，因为加锁是一个相对昂贵的动作。注释中解释了这背后的逻辑，即使在`c.closed`和`full(c)`的间隙中 channel 被关闭了，这个判断依然是逻辑自洽的，它表示某个时间点 channel 是“开放且满”的状态，因此返回`false`是完全正确的。

如果Fast Path 没有命中，就需要加锁来访问 channel 的状态。
```go
lock(&c.lock)

if c.closed != 0 {
    unlock(&c.lock)
    panic(plainError("send on closed channel"))
}
```
再次检查 channel 是否关闭。如果确实关闭了，则需要`panic`。

接下来则会按优先级尝试两种最理想的发送方式。
```go
if sg := c.recvq.dequeue(); sg != nil {
    // Found a waiting receiver. We pass the value we want to send
    // directly to the receiver, bypassing the channel buffer (if any).
    send(c, sg, ep, func() { unlock(&c.lock) }, 3)
    return true
}
```
最高优先级的则是当接收等待队列`recvq`中有正在等待的goroutine 的情况。这是最高效的通信方式，`send`函数会直接将要发送的数据从发送方的内存（`ep`）拷贝到接收方的内存（`sg.elem`），并且这个过程完全绕过了 channel 的`buf`缓冲区。`func() { unlock(&c.lock) }`则是一个回调，确保在唤醒对方之前释放锁。
> 这里`recvq`中存在`goroutine`，其实也意味着当前的channel 是空的，否则如果有数据的话就会直接被正在等待的`goroutine`读走了。

```go
if c.qcount < c.dataqsiz {
    // Space is available in the channel buffer. Enqueue the element to send
    qp := chanbuf(c, c.sendx)
    if raceenabled {
        racenotify(c, c.sendx, nil)
    }
    typedmemmove(c.elemtype, qp, ep)
    c.sendx++
    if c.sendx == c.dataqsiz {
        c.sendx = 0
    }
    c.qcount++
    unlock(&c.lock)
    return true
}
```
如果没有等待的接受者，检查 channel 的缓冲区 buf 是否还有空间（`c.qcount < c.dataqsiz`）。如果存在空间，则会按顺序完成以下动作：
1. `qp := chanbuf(c, c.sendx)`：计算出channel `buf`环形队列中下一个可用的存储槽的内存地址
2. `typedmemmove(c.elemtype, qp, ep)`：将要发送的数据从`ep`拷贝到缓冲区槽`qp`中
3. `c.sendx++`：更新发送索引`sendx`，如果到达末尾则绕回 0
4. `c.qcount++`：将缓冲区中的元素计数加一
5. `unlock(&c.lock)`：释放锁，操作完成
6. 发送成功，返回`true`

```go
if !block {
    unlock(&c.lock)
    return false
}

// Block on the channel. Some receiver will complete out operation for us.
gp := getg()
mysg := acquireSudog()
// No stack splits between assigning elem and enqueuing mysg
// on gp.waiting where copystack can find it.
mysg.elem = ep
mysg.waitlink = nil
mysg.g = gp
mysg.isSelect = false
mysg.c = c
gp.waiting = mysg
gp.param = nil
c.sendq.enqueue(mysg)

gopark(chanparkcommit, unsafe.Pointer(&c.lock), ...)
// Ensure the value being sent is kept alive until the
// receiver copies it out. The sudog has a pointer to the
// stack object, but sudogs aren't considered as roots of the
// stack tracer.
KeepAlive(ep)
```
如果以上两种情况都不满足，发送方就必须阻塞自己。
1. `if !block`：如果此时仍未发送成功，并且这是一个非阻塞调用，那么就只能放弃了。释放锁并返回`false`。
2. 准备阻塞：
	- `gp := getg()`：获取当前 goroutine 的`g`结构体
	- `mysg := acquireSudog()`：从池中获取一个`sudog`结构体，作为当前 goroutine 在等待队列中的“排队凭证”
	- 填充`sudog`：将 goroutine、要发送的数据的指针（`ep`）等关键信息存入`mysg`
	- `c.sendq.enqueue(mysg)`：讲这个`sudog`加入到 channel 的发送等待队列（`sendq`）中
3. 调用`gopark`让 goroutine 进入休眠。`gopark`会在休眠前执行`chenparkcommit`函数，这个函数会释放 channel 的锁。这是绝对必要的，如果不释放锁，就没有其他 goroutine 能够访问这个 channel，也没人能唤醒我们，导致死锁。
4. `KeepAlive(ep)`：这是一个给编译器的指令，确保`ep`指向的栈上变量在 goroutine 休眠期间不会被 GC 回收。

```go
// ... (woken up here)

closed := !mysg.success
// ... (cleanup gp and mysg) ...
releaseSudog(mysg)

if closed {
    // was woken up because the channel was closed
    panic(plainError("send on closed channel"))
}
return true
```
当一个接收者从 channel 取走数据后，它会唤醒一个在`sendq`中等待的发送者。代码将从`gopark`（阻塞点）之后继续执行。
1. `closed := !mysg.success`：唤醒我们的接收者在完成操作之后，会设置`mysg.success`标志。如果是一个接收者成功取走了数据，`success`将会是`true`。但如果是`closechan`函数将我们唤醒，则会是`false`。通过这个标志我们就能知道是被正常接收了，还是因为 channel 被关闭了。
2. 释放`sudog`，清理`g`上的等待状态。
3. `if closed`：如果是因为关闭而被唤醒，那么发送操作必须`panic`。
4. 如果一切正常，则返回`true`。

### send
```go
// send process a send operation on an empty channel c.
// The value ep sent by the sender is copied to the receiver sg.
// The receiver is then woken up to go on its merry way.
// Channel c must be empty and locked. send unlocks c with unlockf.
// sg must already be dequeued from c.
// ep must be non-nil and point to the heap or the caller's stack.
func send(c *hchan, sg *sudog, ep unsafe.Pointer, unlockf func(), skip int) 
```
这个`send`函数专门处理一种特定的场景：当一个 goroutine 向一个空的 channel 发送数据时，有另一个 goroutine 已经在该 channel 上等待接收数据。在这种情况下，数据可以直接从发送者复制给接收者，而无需经过 channel 的内部缓冲区。
可以看到，输入包含以下参数：
- `c *hchan`：指向 channel
- `sg *sudog`：一个在 channel 上等待的 goroutine
- `ep unsafe.Pointer`：指向要发送的数据
- `unlockf func()`：用于给 channel 解锁
- `skip int`：用于`goready`函数，表示在恢复接收者goroutine 的堆栈跟踪时要跳过的帧数

```go
if sg.elem != nil {
    sendDirect(c.elemtype, sg, ep)
    sg.elem = nil
}
```
`sendDirect`会将数据从发送者`ep`直接拷贝到接收者`sg`。它会根据 channel 的元素类型`c.elemtype`来执行内存拷贝。
拷贝完成后，`sg.elem`被设置为`nil`，表示数据已经成功传递。

```go
gp := sg.g
unlockf()
gp.param = unsafe.Pointer(sg)
sg.success = true
if sg.releasetime != 0 {
    sg.releasetime = cputicks()
}
goready(gp, skip+1)
```
接下来则会做唤醒接收者goroutine 的操作：
1. `gp := sg.g`：获取等待接收的 goroutine 的指针
2. `unlockf()`：在唤醒接收者之前，先释放 channel 的锁。这是为了避免死锁和提高并发性能。如果先唤醒再解锁，被唤醒的 goroutine 则可能会立即尝试获取锁，从而导致性能下降
3. `gp.param = unsafe.Pointer(sg)`：设置接收者 goroutine 的一个参数，用于传递这次通信的一些信息
4. `sg.success = true`：标记数据接收成功
5. `if sg.releasetime != 0 ...`：记录 goroutine 的释放时间
6. `goready(gp, skip+1)`：`goready`函数会将接收者`goroutine(gp)`的状态从“等待”变为“可运行”，并将其放入调度器的运行队列中。这样，调度器在下一次调度时就可以执行这个 goroutine 了。

### sendDirect
```go
// Sends and receives on unbuffered or empty-buffered channels are the
// only operations where one running goroutine writes to the stack of
// another running goroutine. The GC assumes that stack writes only
// happen when the goroutine is running and are only done by that
// goroutine. Using a writer barrier is sufficient to make up for 
// violating that assumption, but the write barrier has to work.
// typedmemmove will call bulkBarrierPreWrite, but the target bytes
// are not in the heap, so that will not help. We arrange to call
// memmove and typeBitsBulkBarrier instead.
func sendDirect(t *_type, sg *sudog, src unsafe.Pointer) {
    // src is on our stack, dst is a slot on another stack.

    // Once we read sg.elem out of sg, it will no longer
    // be updated if the destination's stack gets copied (shrunk).
    // So make sure that no preemption points can happen between read & use.
    dst := sg.elem
    typeBitsBulkBarrier(t, uintptr(dst), uintptr(src), t.Size_)
    // No Need for cgo write barrier checks because dst is always
    // Go memory.
    memmove(dst, src, t.Size_) 
}
```
这里专门封装了一个函数来进行内存的拷贝，那为什么不直接用`memcpy`或者`typedmemmove`呢？
答案就在这个函数的注释里。GC 有一个基本假设：对一个 goroutine 的栈进行写入，只有当该 goroutine 自己在运行时，由它自己完成。而如果想要违反这一假设，就需要使用“写屏障”。如果采用`typedmemmove`这个函数，虽然会调用一个写屏障（`bulkBarrierPreWrite`），但那个写屏障是为“写入到堆”设计的。而在我们的场景里，目标地址（`dst`）在另一个 goroutine 的栈上，所以这个写屏障不适用。因此，我们的解决方案是：调用底层的、无 GC 感知的`memmove`函数来进行拷贝，并在此之前手动调用一个专门的写屏障`typeBitsBulkBarrier`。这个函数会扫描`src`指向的内存区域，如果根据`t`的类型信息发现里面包含了任何指针，它就会对这些指针所指向的对象进行标记。这相当于告诉 GC：这些对象现在被接收者 goroutine 的栈引用了，它们是存活的，不要回收它们。
同时，在`dst := sg.elem`中有一个重要的细节：在 Go 中，栈是可以收缩的。根据注释，一旦我们读出了这个值，就必须立即使用它，期间不能有任何可能导致当前 goroutine 被抢占的操作。因为如果发生抢占，接收者的栈可能会被移动（收缩），导致我们刚取出的`dst`指针失效。幸运的是，这几行代码足够短，编译器能保证它们是原子执行的，不会被中断。

## 读流程
### chanrecv
这个函数的目标是从指定的 channel 中接收一个值，并将其写入到 `ep` 指向的内存地址。同时，它也是 `<-ch` 操作的底层实现。
```go
func chanrecv(c *hchan, ep unsafe.Pointer, block bool) (selected, received bool)
```
- `c *hchan`：指向 channel 的内部表示
- `ep unsafe.Pointer`：指向用于存放接收到数据的内存位置。如果为`nil`，则接收到的数据被丢弃
- `block bool`：如果为`true`，则表示这是一个阻塞操作（如`val := <-ch`）；否则表示这是一个非阻塞操作（如`select`语句）
- 返回值`(selected, received bool)`：`selected`表示是否成功与 channel 进行了交互，被用于驱动`select`语句。对于非阻塞调用，如果 channel 为空，`selected`会是`false`。`received`表示是否接收到了一个真实的值。

```go
// ...
if c == nil {
    if !block {
        return
    }
    gopark(nil, nil, waitReasonChanReceiveNilChan, traceBlockForever, 2)
    throw("unreachable")
}
// ...
// Fast path: check for failed non-blocking operation without acquiring the lock.
if !block && empty(c) {
    // After observing that the channel is not ready for receiving, we observe whether
    // channel is closed.
    //
    // Reordering of these checks could lead to incorrect behavior when racing with a close.
    // For example, if the channel was open and not empty, was closed, and then drained,
    // reordered reads could incorrectly indicate "open and empty". To pervent reordering,
    // we use atomic loads for both checks, and rely on emptying and closing to happen in
    // seperate critical sections under the same lock. This assumption fails when closing 
    // an unbuffered channel with a blocked send, but that is an error condition anyway.
    if atomic.Load(&c.closed) == 0 {
        // Because a channel cannot be reopened, the later observation of the channel
        // being not closed implies that it was also not closed at the moment of the
        // first observation. We behave as if we observed the channel at that moment
        // and report that the receive cannot proceed.
        return
    }
    // The channel is irreversibly closed. Re-check whether the channel has any pending data
    // to receive, which could have arrived between the empty and closed checks above.
    // Sequential consistency is also required here, when racing with such a send.
    if empty(c) {
        // ...
        if ep != nil {
            typedmemclr(c.elemtype, ep)
        }
        return true, false
    } 
}
```
首先是初始检查和“快速失败”阶段：
1. 对于`nil` channel，尝试从它接收会永久阻塞。如果是非阻塞模式，则直接返回；
2. 针对非阻塞调用的一个重要优化，它在获取锁之前检查 channel 是否为空。
	- 如果是打开的并且为空，那它没有可接收的数据，直接返回；
	- 如果是关闭的，则需要再次检查是否为空，因为可能有数据在检查是否关闭和是否为空的间隙中被发送。如果为空，则`typedmemclr`清零目标内存（返回零值）；否则需要进入下面的慢路径进行处理。

```go
lock(&c.lock)

if c.closed != 0 {
    if c.qcount == 0 {
        unlock(&c.lock)
        if ep != nil {
            typedmemclr(c.elemtype, ep)
        }
        return true, false
    }
    // The channel has been closed, but the channel's buffer have data.
} else {
    // Just found waiting sender with not closed.
    if sg := c.sendq.dequeue(); sg != nil {
        // Found a waiting sender. If buffer is size 0, receive value
        // directly from sender. Otherwise, receive from head of queue
        // and add sender's value to the tail of the queue (both map to 
        // the same buffer slot because the queue is full).
        recv(c, sg, ep, func() { unlock(&c.lock) }, 3)
        return true, true
    }
}
```
接下来，获取 channel 的锁并处理核心逻辑。可以看到，分别处理了 channel 已关闭和未关闭的逻辑：
- Case 1：channel 已关闭
	- 如果 channel 被关闭且缓冲区为空，则解锁并返回零值
	- 如果缓冲区仍有数据，则会继续向下执行，进入缓冲区接收数据的逻辑
- Case 2：channel 未关闭
	- 检查发送等待队列`c.sendq`，如果`dequeue`返回了一个`sudog`，则会直接调用`recv`函数，它会直接从等待的发送者那里拷贝数据到`ep`，然后唤醒那个发送者 goroutine。这里的优化逻辑与`chansend`中类似。

```go
if c.qcount > 0 {
    // Receive directly from queue
    qp := chanbuf(c, c.recvx)
    if ep != nil {
        typedmemmove(c.elemtype, ep, qp)
    }
    typedmemclr(c.elemtype, qp)
    c.recvx++
    if c.recvx == c.dataqsiz {
        c.recvx = 0
    }
    c.qcount--
    unlock(&c.lock)
    return true, true
}
```
如果前面的情况都不满足，则会检查缓冲区`c.qcount`。如果有数据，那么计算出它在环形队列中的地址`qp`，使用`typedmemmove`将数据从源地址`qp`拷贝到目标地址`ep`，并清理源地址中的数据，更新索引和缓冲区计数，最后解锁返回。

```go
if !block {
    unlock(&c.lock)
    return false, false
}

// no sender available: block on this channel.
gp := getg()
mysg := acquireSudog()
// ...
mysg.elem = ep
mysg.g = gp
mysg.c = c
c.recvq.enqueue(mysg)

// ...
gopark(chanparkcommit, unsafe.Pointer(&c.lock), reason, traceBlockChanRecv, 2)
```
如果执行到了这部分，则说明 channel 是打开的，但是缓冲区里面没有数据，也没有等待中的发送者。
- 此时如果是非阻塞模式，则不再等待，直接返回。
- 如果是阻塞模式，则当前 goroutine 将进入等待状态。此时会将当前 goroutine 包装成一个`sudog`，并放入等待队列`recvq`中。最后调用 gopark，它会释放 channel 的锁并让当前 goroutine 休眠，此时 CPU 则会切换去执行其他的 goroutine。

```go
// someone woke us up
// ...
success := mysg.success
gp.param = nil
releaseSudog(mysg)
return true, success
```
当`gopark`返回后，代码会从这里继续执行。`mysg.success`字段会被发送方设置，如果为`true`，表示成功接收了一个值，如果 channel 在我们等待时被关闭了，关闭操作会唤醒我们并将`success`设置为`false`。最后，做一些清理工作，释放`sudog`，返回。

### recv
与`send`类似，`recv`的调用时机也是当`sendq`中有正在等待的 goroutine 时。

```go
if c.dataqsiz == 0 {
    if ep != nil {
        // copy data from sender
        recvDirect(c.elemtype, sg, ep)
    }
}
```
当 channel 无缓冲区时，可直接进行内存拷贝，将数据从发送者直接拷贝到接收者的内存空间。

```go
else {
    // Queue is full. Take the item at the
    // head of the queue. Make the sender enqueue
    // its item at the tail of the queue. Since the
    // queue is full, those are both the same slot.
    gp := chanbuf(c, c.recvx)
    // copy data from queue to receiver
    if ep != nil {
        typedmemmove(c.elemtype, ep, qp)
    }
    // copy data from sender to queue
    typedmemmove(c.elemtype, qp, sg.elem)
    c.recvx++
    if c.recvx == c.dataqsiz {
        c.recvx = 0
    }
    c.sendx = c.recvx // c.sendx = (c.send+1) % c.dataqsiz
}
```
否则，则可以证明此时的缓冲区是满的。
1. 首先让`qp`指向 channel 缓冲区中最旧的一个元素（即队头`c.recvx`），将这个最旧的元素从缓冲区拷贝到接收者的目标地址
2. 将等待中的发送者的数据拷贝到这个空位上
3. 更新索引，让`sendx`和`recvx`相同，维持缓冲区已满的状态

最后则是一些公共的收尾逻辑，与`send`大致相同，不再赘述。
### recvDirect
```go
func recvDirect(t *_type, sg *sudog, dst unsafe.Pointer) {
    // dst is on our stack or the heap, src is on another stack.
    // The channel is locked, so src will not move during this
    // operation.
    src := sg.elem
    typeBitsBulkBarrier(t, uintptr(dst), uintptr(src), t.Size_)
    memmove(dst, src, t.Size_)
}
```
与`sendDirect`类似，引入写屏障来进行跨 goroutine 的内存写入，不再赘述。


## 关闭流程
### closechan
这个函数是`close(ch)`的底层实现，用于关闭 channel，并释放发送队列和接收队列中的资源。

```go
if c == nil {
    panic(plainError("close of nil channel"))
}
lock(&c.lock)
if c.closed != 0 {
    unlock(&c.lock)
    panic(plainError("close of closed channel"))
}
```
首先进行一些检查工作：
1. `close(nil)`：检查关闭 nil channel 的非法操作
2. `lock(&c.lock)`：获取锁，确保在关闭过程中没有其他 goroutine 对这个 channel 进行操作
3. 重复关闭检查

```go
// ...
c.closed = 1
```
标记为关闭状态。

```go
var glist glist
// release all readers
for {
    sg := c.recvq.dequeue()
    if sg == nil {
        break
    }
    if sg.elem != nil {
        typedmemclr(c.elemtype, sg.elem)
        sg.elem = nil
    }
    gp := sg.g
    gp.param = unsafe.Pointer(sg)
    sg.success = false
    glist.push(gp)
}
```
释放 channel 关联的接收队列。
1. 创建一个 goroutine 列表`glist`，用于保存需要释放的所有 goroutine。
2. `typedmemclr(c.elemtype, sg.elem)`：如果等待的接收者提供了一个内存地址用来接收值，现在需要将这块内存清理掉。
3. `sg.success = false`：做标记，当 goroutine 被唤醒后，会检查这个标志（可见`chansend`和`chanrecv`中的逻辑），据此判断它有没有收到一个真实的值。
4. 将这个 goroutine 放入临时列表`glist`中。

```go
// release all writers (they will panic)
for {
    sg := c.sendq.dequeue()
    if sg == nil {
        break
    }
    gp := sg.g
    gp.param = unsafe.Pointer(sg)
    sg.success = false
    glist.push(gp)
}
```
同样，释放 channel 关联的发送队列。只是对于发送者而言，如果检查发现`success`为`false`，它就知道 channel 在它等待时被关闭了，然后直接 panic。（具体逻辑见`chansend`）。

```go
unlock(&c.lock)

// Ready all Gs now that we've dropped the channel lock.
for !glist.empty() {
    gp := glist.pop()
    gp.schedlink = 0
    goready(gp, 3)
}
```
先解锁，再唤醒`glist`中的所有 goroutine。这里只是为了减少锁的持有时间，提升并发性能。调用`goready`可以将每个等待的 goroutine 放回调度器的可运行队列中。这些 goroutine 在下一次被调度时，就会执行`chansend`/`chanrecv`中的后续逻辑。




## 旁路 & 辅助函数
### chanbuf
```go
// chanbuf(c, i) is pointer to the i'th slot in the buffer.
//
// chanbuf should be an internal detail,
// but widely used packages access it using linkname.
// Notable members of the hall of shame include:
//   - github.com/fjl/memsize
//
// Do not remove or change the type signature.
// See go.dev/issue/67401.
//
//go:linkname chanbuf
func chanbuf(c *hchan, i uint) unsafe.Pointer {
    return add(c.buf, uintptr(i)*uintptr(c.elemsize))
}
```
一个用于返回环形队列缓冲区指定位置元素的辅助方法。

### full
```go
// full reports whether a send on c would block (that is, the channel is full).
// It uses a single word-size read of mutable state, so although
// the answer is instantaneously true, the correct answer may have changed
// by the time the calling function receives the return value.
func full(c *hchan) bool {
    // c.dataqsiz is immutable (never written after the channel is created)
    // so it is safe to read at any time during channel operation.
    if c.dataqsiz == 0 {
        // Assumes that a pointer read is relaxed-atomic.
        return c.recvq.first == nil
    }
    // Assumes that a uint read is relaxed-atomic.
    return c.qcount == c.dataqsiz
}
```
从注释中可以看到，这个函数仅能表示调用瞬间的状态，用于快速检查缓冲区是否为满。对`c.recvq.first`的检查是因为如果接收队列为空，那么发送者来了就得等，就可以认为 channel 是“满”的。

### empty
```go
// empty reports whether a read from c would block (that is, the channel is
// empty). It is atomically correct and sequentially consistent at the moment
// it returns, but since the channel is unlocked, the channel may become
// non-empty immediately afterward.
func empty(c *hchan) bool {
    // c.dataqsiz is immutable
    if c.dataqsiz == 0 {
        return atomic.Loadp(unsafe.Pointer(&c.sendq.first)) == nil
    }
    // ...
    return atomic.Loaduint(&c.qcount == 0)
}
```
类似`full`，这里判断的是 channel 是否为空。而之所以这里用了`atomic`的方式来读取，是因为`empty`主要应用在`chanrecv`当中，而在`chanrecv`中对于代码的执行顺序有着严格的要求，即`empty`必须在`closed`的检查之前完成。`atomic`除了可以保证原子性外，还能防止进行指令重排。

### chanlen
```go
func chanlen(c *hchan) int {
    if c == nil {
        return 0
    }
    // ...
    return int(c.qcount)
}
```
获取当前的缓冲区长度。

### chancap
```go
func chancap(c *hchan) int {
    if c == nil {
        return 0
    }
    return int(c.dataqsiz)
}
```
获取当前的缓冲区容量。

### enqueue
```go
func (q *waitq) enqueue(sgp *sudog) {
    sgp.next = nil
    x := q.last
    if x == nil {
        sgp.prev = nil
        q.first = sgp
        q.last = sgp
        return
    }
    sgp.prev = x
    x.next = sgp
    q.last = sgp
}
```
环形队列入队函数，链表操作，比较常规。

### dequeue
```go
func (q *waitq) dequeue() *sudog {
    for {
        sgp := q.first
        if sgp == nil {
            return nil
        }
        y := sgp.next
        if y == nil {
            q.first = nil
            q.last = nil
        } else {
            y.prev = nil
            q.first = y
            sgp.next = nil
        }
		
        // if a goroutine was put on this queue because of a
        // select, there is a small window between the goroutine
        // being woken up by a different case and it grabbing the
        // channel locks. Once it has the lock
        // it removes itself from the queue, so we won't see it after that.
        // We use a flag in the G struct to tell us when someone
        // else has won the race to signal this goroutine but the goroutine
        // hasn't removed itself from the queue yet.
        if sgp.isSelect {
            if !sgp.g.selectDone.CompareAndSwap(0, 1) {
                // We lost the race to take this goroutine.
                continue
            }
        }

        return sgp
    }
}
```
这里的实现不仅仅将`sudog`进行出队动作，还考虑了并发条件下的竞争问题，主要关注`if sgp.isSelect`分支。
首先，想象一个`select`语句：
```go
select {
case <-ch1:
    // ...
case <-ch2:
    // ...
}
```
如果`ch1`和`ch2`同时为空，当前 goroutine 必须同时等待这两个 channel。为了实现这一点，会创建一个`sudog`，然后将其同时放入`ch1`和`ch2`的`recvq`当中。这里就产生了一个问题：一个`sudog`同时存在于多个地方。
那么此时，如果存在两个goroutine：a 和 b 同时调用`ch <- val`进行取值，那么它们会发现自己的`recvq`的头都是这个`sudog`。现在，这两个 goroutine 就陷入了竞争，都想通过`dequeue`来唤醒这个`sudog`。但根据`select`的规则，只有一个能赢，`isSelect`分支的目的就是为了判断谁能抢占这个`sudog`。
`isSelect`是一个标志，当一个`sudog`因为`select`而被放入等待队列时，这个标志就会被设置为`true`，代表它是一个被抢占的资源。接下来，则会判断`sudog`指向的`g`中的一个原子字段`selectDone`，可以把它想象成一个 goroutine 的“状态锁”，初始值为 0，表示还没有被抢占。
`CompareAndSwap(0, 1)`是原子交换操作，如果当前值为 0，则改为 1，然后返回`true`；否则什么都不做，返回`false`。
所以也就是说，看谁能成功将这个`sudog.g`的`selectDone`字段修改为 1，那么它就抢占成功了，此时就会将这个`sudog`返回给它；否则抢占失败，继续循环，尝试获取队列中的下一个元素。
而注释中的窗口期内，输家在调用`dequeue`时，仍然会看到这个`sudog`，如果没有`selectDone`这个原子锁，输家也会错误地认为自己抢占成功，可能会导致重复唤醒这个`sudog`，或者出现其他的数据竞争问题。

# 扩展
1. **为什么需要在 `makechan` 函数中做内存对齐检查？**
	首先，我们需要理解什么是内存对齐。
	简单来说，CPU 访问内存不是逐个字节进行的，它通常以“字”（word）为单位进行读取，一个“字”在 64 位系统上通常是 8 字节。
	
	- 对齐访问（Aligned Access）：如果一个 8 字节的数据存储在一个地址是 8 的倍数的位置，CPU 只需要一次内存操作就能读取整个数据。这是最高效的。
	- 非对齐访问（Unaligned Access）：如果这个 8 字节的数据存储在一个非 8 的倍数的地址，它就会跨越两个内存“字”的边界。这时，CPU 必须执行两次内存操作，分别读取两部分，然后在内部将它们拼接起来。这会带来显著的性能下降。
	
	更糟糕的是，在某些 CPU 架构上，非对齐访问是不被允许的，会直接导致硬件异常。此外，原子操作也必须在对齐的内存上进行才能保证原子性。
	因此，Go 的类型系统为每种类型都定义了一个对齐要求（`_type.Align_`），编译器和运行时必须遵守这个要求来分配内存。
	
2. 深入分析内存对齐检查的两部分
	`maxAlign`是 Go 运行时定义的一个常量，代表了当前平台内存分配器所能保证的**最大对齐基数**。在 64 位的系统上，`maxAlign`通常是 8。这意味着`mallocgc`分配的任何内存块，其起始地址都至少是8 的倍数。
	
	第一部分：`hchanSize % maxAlign != 0`
	这个检查是在验证`hchan`结构体自身的大小（`hchanSize`）是否是平台最大对齐值（`maxAlign`）的整数倍。那为什么它对“合并分配”如此重要？
	让我们来回顾一下“合并分配”的优化：`mallocgc(hchansize + mem, ...)`。这会分配一段连续的内存，其内存布局如下：
	```bash
	[ hchan 结构体 (hchanSize 字节) | 缓冲区 buf (mem 字节) ]
	^                                 ^
	|                                 |
	c (起始地址)                   c + hchanSize (buf 的起始地址)
	```
	在`hchan`中，我们需要分配的内存大小可以大致用`mallocgc(hchansize + unsafe.Sizeof(hchan.buf))`来表示。由于`mallocgc`返回的起始地址 c 是保证对齐到`maxAlign`的，如果`hchanSize`自身也是`maxAlign`的倍数，那么`c+hchanSize`自然也是`maxAlign`的倍数，这就保证了紧跟在`hchan`结构体后面的缓冲区`buf`的起始地址也是对齐的。
	
	第二部分：`elem.Align_ > maxAlign`
	这个检查是在验证 channel 中元素的对齐要求（`elem.Align_`）是否超过了平台内存分配器所能保证的最大对齐值（`maxAlign`）。这是一个安全性检查，它确保我们不会创建一个无法满足其对其要求的 channel。
	正常来说，Go 中内置的数据类型都没有超过 8 字节对齐的，这里的检查更多是对通过`unsafe`创建出来的类型进行检查。
	
3. `hchansize`的计算公式解析
	可以看到，`hchanSize`的计算公式为`unsafe.Sizeof(hchan{}) + uintptr(-int(unsafe.Sizeof(hchan{})) & (maxAlign - 1))`，那为什么是这样算呢？
	第一部分非常直接，`unsafe.Sizeof(hchan{})`就是`hchan`结构体在内存中占用的原始、未经任何处理的字节数。这个大小取决于结构体内部字段的类型和数量，以及编译器的布局策略。
	第二部分的作用是计算为了达到对齐的要求，需要在原始大小上额外添加的填充字节数。具体而言就是将`unsafe.Sizeof(hchan{})`取反后与`maxAlign - 1`做`&`操作，就可以得到这个需要填充的字节数。
	
4. 什么是写屏障？
	写屏障是一小段由编译器插入的代码，它在每次“指针写入”操作时执行。它的主要作用是通知 GC：“我刚刚把一个指针写到了内存的这个位置，你可能需要更新你的可达对象信息了”。这可以防止 GC 错误地回收仍然在被引用的对象。
	
5. chanrecv 中的 fast path 检查顺序问题
	在代码中采用的顺序是：首先检查`empty`，然后检查`atomic.Load(&c.closed)`。
	为什么这样是安全的？
	这里的关键逻辑依赖于一个事实：**一个 channel 一旦被关闭，就永远不可能被重新打开。** 因此，如果我们在 T2 时刻观察到 channel 是打开的，我们就可以百分之百地推断出它在之前的 T1 时刻也一定是打开的。
	
	如果颠倒过来，则可以设想这样一个场景：假设有一个 channel，现在它是打开的并且有一个元素，有三个 goroutine 正在工作，a 正在执行这个 fast path，b 准备调用 `close(ch)`，c 准备从 channel 接收数据。
	时间线：
	- T1：a 执行第一个检查：`atomic.Load(&c.closed)`。此时结果为`true`
	- T2：上下文切换到 b，它调用了`close(ch)`，现在 channel 被关闭
	- T3：c 开始运行，它从缓冲区中取走了元素，现在`empty(c) == true`
	- T4：继续执行 a，此时`empty`检查通过
	那么此时可以看到，channel 的真实状态是“open and not empty”，但这里却判断为了“open and empty”。

6. 为什么只对非阻塞的情况做 fast path 的处理？
	因为对于非阻塞调用而言，它的核心需求是想立刻知道结果，那么就可以快速尝试一下，如果没有数据就马上返回。而阻塞的情况如果没有的话，还是得等数据进来，因此没有做 fast path 的必要。
