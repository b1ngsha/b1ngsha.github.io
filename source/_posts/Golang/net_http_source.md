---
title: Golang源码精读：HTTP标准库实现原理
date: 2025-02-09 15:07:25
tags: Golang
category: Golang
---

本文基于 go version go1.23.3 darwin/arm64 来对Golang中的 HTTP 标准库实现原理进行深入解读。
<!-- more -->
## 整体框架
在 Golang 当中，启动一个 http 服务非常方便：
```go
import (
    "net/http"
)

func main() {
    http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("pong"))
    })

    http.ListenAndServe(":8091", nil)
}
```
在上述代码中，做了两件事：
- 调用 `http.HandleFunc` 方法，注册了对应请求路径 /ping 的 handler。
- 调用 `http.ListenAndServe` 方法，启动了一个端口为 8091 的 http 服务。

在 Golang 当中发送 http 请求的实现也同样简单。例如：
```go
func main() {
    reqBody, _ := json.Marshal(map[string]string{"key1": "val1", "key2": "val2"})
    
    resp, _ := http.Post(":8091", "application/json", bytes.NewReader(reqBody))
    defer resp.Body.Close()
    
    respBody, _ := io.ReadAll(resp.Body)
    fmt.Printf("resp: %s", respBody)
}
```

本文涉及内容的源码均位于 net/http 库下，各模块的文件位置如下表所示：

| 模块        | 文件                    |
| --------- | --------------------- |
| 服务端       | net/http/server.go    |
| 客户端——主流程  | net/http/client.go    |
| 客户端——构造请求 | net/http/request.go   |
| 客户端——网络交互 | net/http/transport.go |

## 服务端
### 核心数据结构
#### Server
基于面向对象的思想，整个 http 服务端模块都被封装在 Server 类当中。
```go
type Server struct {
    // 服务器监听的地址（host:port） 如果为空则使用80端口
    Addr string
    // 路由处理器
    Handler Handler // handler to invoke, http.DefaultServeMux if nil
    // 如果为真，则会将OPTIONS请求路由到对应的Handler；否则直接响应200 OK和Content-Length: 0
    DisableGeneralOptionsHandler bool
    // TLS相关配置
    TLSConfig *tls.Config
    // 读取整个请求的超时时间
    ReadTimeout time.Duration
    // 读取请求头的超时时间，为0或负值时使用ReadTimeout值
    ReadHeaderTimeout time.Duration
    // 写响应超时时间
    WriteTimeout time.Duration
    // 当开启keep-alives时等待下一个请求的超时时间，为0或负值时使用ReadTimeout
    IdleTimeout time.Duration
    // 最大请求头字节数，为0时使用DefaultMaxHeaderBytes值
    MaxHeaderBytes int
    // 当发生协议升级时的回调函数，当不为空时，HTTP/2不会自动被启用
    TLSNextProto map[string]func(*Server, *tls.Conn, Handler)
    // 客户端连接状态变化时的回调函数
    ConnState func(net.Conn, ConnState)
    // 指定专门用于处理error的logger，为空时则使用log包的标准logger
    ErrorLog *log.Logger
    // 指定返回base context的方法，如果为空则为默认的context.Background()
    BaseContext func(net.Listener) context.Context
    // 用于修改base context以在新连接中使用
    ConnContext func(ctx context.Context, c net.Conn) context.Context
    
    // ...
}
```
Handler 是 Server 中最核心的字段，实现了从请求路径 path 到具体处理函数 handler 的注册和映射能力。

#### Handler
```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```
Handler 是一个 interface，定义了方法：ServeHTTP。
该方法的作用是，根据 http 请求 Request 中的请求路径 path 映射到对应的 handler 处理函数，对请求进行处理和响应。

#### pattern
```go
type pattern struct {
    // 原始的URL模式字符串
    str string // original string
    // 请求方法
    method string
    // 主机名
    host string
    
    // 这里对path的表示方式与常规方式不同
    // 如果path以"/"结尾，则会被表示为一个匿名的"..."通配符
    // 例如，"a/"会被表示成一个segment "a"后面跟随着一个multi==true的segment
    // 如果path以"{$}"结尾，则会被表示为常规的"/"
    // 例如，"a/{$}"会被表示为segment "a"后面跟随着一个segment "/"
    segments []segment
    // 注册该pattern时的源代码位置
    loc string // source location of registering call, for helpful messages
}
```
pattern 用于表示一个可以被 HTTP 请求匹配的 URL 模式，包含了 optional method、optional host 和 path。

#### segment
```go
type segment struct {
    // 存储路径段的字面量、通配符名称或特殊符号
    s string // literal or wildcard name or "/" for "/{$}".
    // 标识该段是否为通配符
    wild bool
    // 标识通配符是否匹配多个路径段（仅当wild==true时生效）
    multi bool // "..." wildcard
}
```
segment 用于定义如何匹配 pattern 中的一个段或多个段，同时支持特殊语法（如通配符和尾部斜杠）

#### ServeMux
```go
type ServeMux struct {
    // 读写互斥锁
    mu sync.RWMutex
    // 树形存储
    tree routingNode
    index routingIndex
    // 路由存储（未来版本可能被移除）
    patterns []*pattern // TODO(jba): remove if possible
    // 1.21版本兼容
    mux121 serveMux121 // used only when GODEBUG=httpmuxgo121=1
}
```
ServeMux 是对 Handler 的具体实现。在 `patterns` 字段中存储了所有注册的路由（可能会在未来的版本中被移除），并采用了树形结构对路由节点进行存储。

#### routingNode
```go
type routingNode struct {
    // 在叶子节点中，保存了pattern和对应的handler
    pattern *pattern
    handler Handler

    // 存储当前节点的子节点
    children mapping[string, *routingNode]
    // 存储一个特殊的子节点，用于处理多段通配符（例如/files/*path）
    multiChild *routingNode // child with multi wildcard
    // 优化字段，用于快速访问key为空的子节点
    emptyChild *routingNode // optimization: child with key ""
}
```
routingNode 是用于实现**路由决策树**的核心。它既可以表示叶子节点，也可以表示内部节点。

#### routingIndex
```go
type routingIndex struct {
    // 按segment的位置和字面量值索引所有注册的路由模式
    // 例如key:{pos: 1, value: "b"}对应pattern"/a/b"和"/a/b/c"
    segments map[routingIndexKey][]*pattern
    // 存储所有以多段通配符结尾的pattern
    multis []*pattern
}
```
routingIndex 是用于优化路由冲突检测的索引结构，它的核心思想在于将 pattern 划分为 segments，然后通过将相同位置的 segment 进行比较以快速排除掉不可能冲突的 pattern。

### 注册handler
![注册handler方法调用链](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/%E6%88%AA%E5%B1%8F2025-02-05%2017.09.42.png)
当用户调用公开方法 http.HandleFunc 注册 handler 时，其实会将其注册到一个 ServeMux 类型的单例 DefaultServeMux 对象当中。
```go
// HandleFunc registers the handler function for the given pattern in [DefaultServeMux].
func HandleFunc(pattern string, handler func(ResponseWriter, *Request)) {
    if use121 {
        DefaultServeMux.mux121.handleFunc(pattern, handler)
    } else {
        // 这里的HandlerFunc是Handler接口的实现类
        DefaultServeMux.register(pattern, HandlerFunc(handler))
    }
}
```

```go
// DefaultServeMux is the default [ServeMux] used by [Serve].
var DefaultServeMux = &defaultServeMux

var defaultServeMux ServeMux
```
在 ServeMux.register 方法中，只是简单调用了 ServeMux.registerErr 方法并处理抛出的异常，具体的注册逻辑都是在 ServeMux.registerErr 方法中实现的。
```go
func (mux *ServeMux) register(pattern string, handler Handler) {
    if err := mux.registerErr(pattern, handler); err != nil {
        panic(err)
    }
}

func (mux *ServeMux) registerErr(patstr string, handler Handler) error {
    // 判空 & 类型断言
    if patstr == "" {
        return errors.New("http: invalid pattern")
    }
    if handler == nil {
        return errors.New("http: nil handler")
    }
    if f, ok := handler.(HandlerFunc); ok && f == nil {
        return errors.New("http: nil handler")
    }

    // 将pattern字符串解析为对象
    pat, err := parsePattern(patstr)
    if err != nil {
        return fmt.Errorf("parsing %q: %w", patstr, err)
    }

    // 获取注册pattern的源代码位置
    // 3代表在调用栈中往上跳过3层
    _, file, line, ok := runtime.Caller(3)
    if !ok {
        pat.loc = "unknown location"
    } else {
        pat.loc = fmt.Sprintf("%s:%d", file, line)
    }

    // 读写锁，防止并发修改异常
    mux.mu.Lock()
    defer mux.mu.Unlock()
    // 检查pattern是否存在冲突
    if err := mux.index.possiblyConflictingPatterns(pat, func(pat2 *pattern) error {
        if pat.conflictsWith(pat2) {
            d := describeConflict(pat, pat2)
            return fmt.Errorf("pattern %q (registered at %s) conflicts with pattern %q (registered at %s):\n%s", pat, pat.loc, pat2, pat2.loc, d)
        }
        return nil
    }); err != nil {
        return err
    }
    // 添加当前pattern
    mux.tree.addPattern(pat, handler)
    mux.index.addPattern(pat)
    mux.patterns = append(mux.patterns, pat)
    return nil
}
```
可以看到，在 ServeMux.registerErr 方法中，有几个核心逻辑：
- 解析 pattern 字符串
- 获取注册 pattern 所在的源代码位置
- 检测当前 pattern 与已注册的 patterns 是否存在冲突
- 添加当前 pattern
接下来，我们来逐个看看具体的方法实现：
```go
func parsePattern(s string) (_ *pattern, err error) {
    // 判空
    if len(s) == 0 {
        return nil, errors.New("empty pattern")
    }
    off := 0 // offset into string
    // 异常处理
    defer func() {
        if err != nil {
            err = fmt.Errorf("at offset %d: %w", off, err)
        }
    }()

    // pattern的格式为[METHOD] [HOST]/[PATH]
    // 在此处根据空格或\t分割为左右两部分
    // found表示pattern中是否存在METHOD
    method, rest, found := s, "", false
    if i := strings.IndexAny(s, " \t"); i >= 0 {
        method, rest, found = s[:i], strings.TrimLeft(s[i+1:], " \t"), true
    }
    if !found {
        rest = method
        method = ""
    }
    if method != "" && !validMethod(method) {
        return nil, fmt.Errorf("invalid method %q", method)
    }
    p := &pattern{str: s, method: method}

    if found {
        off = len(method) + 1
    }
    // 根据"/"分割为host和path两部分
    i := strings.IndexByte(rest, '/')
    if i < 0 {
        return nil, errors.New("host/path missing /")
    }
    p.host = rest[:i]
    rest = rest[i:]
    // 检测host段中是否存在"{"
    // 因为path中存在类似"{name}", "{name...}", or "{$}"这样的特殊匹配
    // 所以如果host段中出现"{"符号的话，就可以认为出现了将path划分到了host段这样的异常情况
    if j := strings.IndexByte(p.host, '{'); j >= 0 {
        off += j
        return nil, errors.New("host contains '{' (missing initial '/'?)")
    }
    // At this point, rest is the path.
    off += i

    // An unclean path with a method that is not CONNECT can never match,
    // because paths are cleaned before matching.
    // 这里的clean path指的是规范的path，不存在"."或".."这样的元素
    if method != "" && method != "CONNECT" && rest != cleanPath(rest) {
        return nil, errors.New("non-CONNECT pattern with unclean path can never match")
    }

    seenNames := map[string]bool{} // remember wildcard names to catch dups
    for len(rest) > 0 {
        // Invariant: rest[0] == '/'.
        rest = rest[1:]
        off = len(s) - len(rest)
        // 匹配最后rest=="/"的情况
        if len(rest) == 0 {
            // Trailing slash.
            p.segments = append(p.segments, segment{wild: true, multi: true})
            break
        }
        i := strings.IndexByte(rest, '/')
        if i < 0 {
            i = len(rest)
        }
        var seg string
        seg, rest = rest[:i], rest[i:]
        if i := strings.IndexByte(seg, '{'); i < 0 {
            // Literal.
            seg = pathUnescape(seg)
            p.segments = append(p.segments, segment{s: seg})
        } else {
            // Wildcard.
            if i != 0 {
                return nil, errors.New("bad wildcard segment (must start with '{')")
            }
            if seg[len(seg)-1] != '}' {
                return nil, errors.New("bad wildcard segment (must end with '}')")
            }
            name := seg[1 : len(seg)-1]
            if name == "$" {
                if len(rest) != 0 {
                    return nil, errors.New("{$} not at end")
                }
                p.segments = append(p.segments, segment{s: "/"})
                break
            }
            name, multi := strings.CutSuffix(name, "...")
            if multi && len(rest) != 0 {
                return nil, errors.New("{...} wildcard not at end")
            }
            if name == "" {
                return nil, errors.New("empty wildcard")
            }
            if !isValidWildcardName(name) {
                return nil, fmt.Errorf("bad wildcard name % q", name)
            }
            if seenNames[name] {
                return nil, fmt.Errorf("duplicate wildcard name %q", name)
            }
            seenNames[name] = true
            p.segments = append(p.segments, segment{s: name, wild: true, multi: multi})
        }
    }
    return p, nil
}
```
可以看到，parsePattern 方法中做的事情其实就是将 patternStr 转换为 pattern 对象，并且根据 "/" 划分为一个个的 segments，其中兼容了 "{name}", "{name...}", 和 "{$}" 这几种通配符的特殊情况。

```go
func (idx *routingIndex) possiblyConflictingPatterns(pat *pattern, f func(*pattern) error) (err error) {
    // Terminology:
    // dollar pattern: one ending in "{$}"
    // multi pattern: one ending in a trailing slash or "{x...}" wildcard
    // ordinary pattern: neither of the above

    // 对传入apply方法的patterns都调用f函数，遇到error时返回
    apply := func(pats []*pattern) error {
        if err != nil {
            return err
        }
        for _, p := range pats {
            err = f(p)
            if err != nil {
                return err
            }
        }
        return nil
    }

    // 将当前index的multis集合中的所有pattern（多段通配符）都尝试直接进行匹配
    // 因为多段通配符可能可以直接匹配pattern的任意路径
    if err := apply(idx.multis); err != nil {
        return err
    }

    // 检查dollar pattern的情况
    if pat.lastSegment().s == "/" {
        // 如果pat的最后一个segment是"/"，就表明这是一个dollar pattern
        // 只有另一个dollar pattern或者multi pattern可以与它产生冲突
        // 那么只需要检查当前index下是否存在相同位置也是"/"的pattern即可
        return apply(idx.segments[routingIndexKey{s: "/", pos: len(pat.segments) - 1}])
    }

    // 检查multi pattern和ordinary pattern的情况
    // 寻找与pat在某个位置有相同字面量或者通配符的pattern
    var lmin, wmin []*pattern
    min := math.MaxInt
    hasLit := false
    for i, seg := range pat.segments {
        if seg.multi {
            break // 如果遍历到多段通配符，则说明后续被通配符覆盖，停止遍历
        }
        if !seg.wild {
            hasLit = true
            // 获取该位置的字面量模式和通配符模式
            lpats := idx.segments[routingIndexKey{s: seg.s, pos: i}]
            wpats := idx.segments[routingIndexKey{s: "", pos: i}]
            // 获取冲突可能性最小的位置
            if sum := len(lpats) + len(wpats); sum < min {
                lmin = lpats
                wmin = wpats
                min = sum
            }
        }
    }
    if hasLit {
        apply(lmin) // 检查存在相同字面量segment的模式
        apply(wmin) // 检查存在相同通配符segment的模式
        return err
    }

    // 检查pat全路径segment都为通配符的情况
    // 无字面量可索引，扫描所有已注册的pattern
    for _, pats := range idx.segments {
        apply(pats)
    }
    return err
}
```
简单来说，在 possiblyConflictingPatterns 方法中，可以快速找出所有**可能与给定路由模式 pat 冲突**的已注册模式。它的核心思想是通过预置的索引（segments 和 multis）缩小检查范围，避免遍历所有模式，从而提升性能。这里传入的 f 函数为一个匿名函数：
```go
func(pat2 *pattern) error {
    if pat.conflictsWith(pat2) {
        d := describeConflict(pat, pat2)
        return fmt.Errorf("pattern %q (registered at %s) conflicts with pattern %q (registered at %s):\n%s", pat, pat.loc, pat2, pat2.loc, d)
    }

    return nil
}
```
在 pat.conflictsWith 方法中进行了 pattern 是否存在冲突的比较：
```go
func (p1 *pattern) conflictsWith(p2 *pattern) bool {
    if p1.host != p2.host {        
        return false
    }
    rel := p1.comparePathsAndMethods(p2)
    return rel == equivalent || rel == overlaps
}
```
这里的逻辑就比较简单，先比较 host 是否相同，然后比较 path 和 method 是否相同来判断两个 pattern 之间是否存在冲突。

```go
// addPattern adds a pattern and its associated Handler to the tree
// at root.
func (root *routingNode) addPattern(p *pattern, h Handler) {
    // First level of tree is host.
    n := root.addChild(p.host)
    // Second level of tree is method.
    n = n.addChild(p.method)
    // Remaining levels are path.
    n.addSegments(p.segments, p, h)
}  

// 采用递归的方式向树中加入节点
// 在叶子结点中保存当前的pattern和handler
func (n *routingNode) addSegments(segs []segment, p *pattern, h Handler) {
    if len(segs) == 0 {
        n.set(p, h)
        return
    }
    seg := segs[0]
    if seg.multi {
        if len(segs) != 1 {
            panic("multi wildcard not last")
        }
        c := &routingNode{}
        n.multiChild = c
        c.set(p, h)
    } else if seg.wild {
        n.addChild("").addSegments(segs[1:], p, h)
    } else {
        n.addChild(seg.s).addSegments(segs[1:], p, h)
    }
}

// addChild adds a child node with the given key to n
// if one does not exist, and returns the child.
func (n *routingNode) addChild(key string) *routingNode {
    if key == "" {
        if n.emptyChild == nil {
            n.emptyChild = &routingNode{}
        }
        return n.emptyChild
    }
    if c := n.findChild(key); c != nil {
        return c
    }
    c := &routingNode{}
    n.children.add(key, c)
    return c
}
```
routingNode.addPattern 方法就是将 pattern 组织成树状结构，并将 pattern 和对应的 handler 信息保存在叶子结点上：
![routingNode树状结构](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/%E6%88%AA%E5%B1%8F2025-02-05%2017.01.29.png)

```go
func (idx *routingIndex) addPattern(pat *pattern) {
    // 如果存在多段通配符，则肯定是在最后一个segment
    if pat.lastSegment().multi {
        idx.multis = append(idx.multis, pat)
    } else {
        if idx.segments == nil {
            idx.segments = map[routingIndexKey][]*pattern{}
        }
        for pos, seg := range pat.segments {
            key := routingIndexKey{pos: pos, s: ""}
            if !seg.wild {
                key.s = seg.s
            }
            idx.segments[key] = append(idx.segments[key], pat)
        }
    }
}
```
在 routingIndex.addPattern 方法中，逻辑比较简单，直接将 pattern 中的 segment 存储到了当前 index  segments 集合中的对应位置。

### 启动server
![启动server方法调用链](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/%E6%88%AA%E5%B1%8F2025-02-06%2015.24.55.png)
```go
func ListenAndServe(addr string, handler Handler) error {
    server := &Server{Addr: addr, Handler: handler}
    return server.ListenAndServe()
}
```
调用 net/http 包下的公开方法 ListenAndServe，可以实现对服务端的一键启动。内部会声明一个新的 Server 对象，并执行 Server.ListenAndServe 方法。
```go
func (srv *Server) ListenAndServe() error {
    if srv.shuttingDown() {
        return ErrServerClosed
    }
    addr := srv.Addr
    if addr == "" {
        addr = ":http"
    }
    ln, err := net.Listen("tcp", addr)
    if err != nil {
        return err
    }
    return srv.Serve(ln)
}
```
Server.ListenAndServe 方法中，根据用户传入的端口，申请到一个监听器 listener，继而调用 Server.Serve 方法。

```go
var ServerContextKey = &contextKey{"http-server"}

type contextKey struct {
    name string
}

func (srv *Server) Serve(l net.Listener) error {   
    // ...
    ctx := context.WithValue(baseCtx, ServerContextKey, srv)
    for {
        rw, err := l.Accept()
        // ...
        connCtx := ctx
        // ...
        c := srv.newConn(rw)
        // ...
        go c.serve(connCtx)
    }
}
```
Server.Serve 方法很核心，体现了 http 服务端的运行架构：for + listener.accept 模式。
- 将 server 封装成一组 kv 对，添加到 context 当中
- 开启 for 循环，每轮循环调用 Listener.Accept 方法阻塞等待新连接到达
- 每有一个新连接到达，就创建一个 goroutine 异步执行 conn.serve 方法负责处理

```go
func (c *conn) serve(ctx context.Context) {
    // ...
    c.r = &connReader{conn: c}
    c.bufr = newBufioReader(c.r)
    c.bufw = newBufioWriterSize(checkConnErrorWriter{c}, 4<<10)
    
    for {
        w, err := c.readRequest(ctx)
        // ...
        serverHandler{c.server}.ServeHTTP(w, w.req)
        w.cancelCtx()
        // ...
    }
}
```
在 serverHandler.ServeHTTP 方法中，会对 Handler 做判断，倘若其未声明，则取全局单例 DefaultServeMux 进行路由匹配，呼应了 http.HandleFunc 中的处理细节。
```go
func (sh serverHandler) ServeHTTP(rw ResponseWriter, req *Request) {
    handler := sh.srv.Handler
    if handler == nil {
        handler = DefaultServeMux
    }    
    // ...
    handler.ServeHTTP(rw, req)
}
```
接下来，兜兜转转依次调用 ServeMux.ServeHTTP 和 ServeMux.findHandler 方法，然后在 ServeMux.matchOrRedirect 和 routingNode.match 方法中，以 Request 中的 host 和 path 作为 pattern，在已注册的 routingTree 当中进行匹配，最后将匹配到的 handler 进行 handler.ServeHTTP 方法的调用做请求的处理和响应。
```go
func (mux *ServeMux) ServeHTTP(w ResponseWriter, r *Request) {
    // ...
    var h Handler
    if use121 {
        h, _ = mux.mux121.findHandler(r)
    } else {
        h, r.Pattern, r.pat, r.matches = mux.findHandler(r)
    }
    h.ServeHTTP(w, r)
}
```

```go
func (mux *ServeMux) findHandler(r *Request) (h Handler, patStr string, _ *pattern, matches []string) {
    var n *routingNode
    host := r.URL.Host
    escapedPath := r.URL.EscapedPath()
    path := escapedPath
    if r.Method == "CONNECT" {
        _, _, u := mux.matchOrRedirect(host, r.Method, path, r.URL)
        if u != nil {
            return RedirectHandler(u.String(), StatusMovedPermanently), u.Path, nil, nil
        }
        n, matches, _ = mux.matchOrRedirect(r.Host, r.Method, path, nil)
    } else {
        host = stripHostPort(r.Host)
        path = cleanPath(path)
        
        var u *url.URL
        n, matches, u = mux.matchOrRedirect(host, r.Method, path, r.URL)
        // ...
    }
    // ...
    return n.handler, n.pattern.String(), n.pattern, matches
}
```

```go
func (mux *ServeMux) matchOrRedirect(host, method, path string, u *url.URL) (_ *routingNode, matches []string, redirectTo *url.URL) {
    // ...
    n, matches := mux.tree.match(host, method, path)
    // ...
    return n, matches, nil
}
```

```go
func (root *routingNode) match(host, method, path string) (*routingNode, []string) {
    if host != "" {
        if l, m := root.findChild(host).matchMethodAndPath(method, path); l != nil {
            return l, m
        }
    }
    return root.emptyChild.matchMethodAndPath(method, path)
}
```

## 客户端
### 核心数据结构
#### Client
与 Server 相同，客户端模块也有一个 Client 类，实现对整个模块的封装：
```go
type Client struct {
    // 指定发出单个HTTP请求的机制
    // 如果为空，使用DefaultTransport
    Transport RoundTripper

    // 指定处理重定向的策略
    // 如果不为空，则会在重定向之前被调用
    // 如果为空，则采用默认的策略，在连续进行十次请求后停止
    CheckRedirect func(req *Request, via []*Request) error

    // cookie管理
    // 如果为空，则只有在request中显式指定才能携带cookie
    Jar CookieJar

    // 超时时间
    Timeout time.Duration
}
```

#### RoundTripper
```go
type RoundTripper interface {
    RoundTrip(*Request) (*Response, error)
}
```
RoundTripper 是执行 HTTP 通信的 interface，需要实现方法 RoundTrip，即通过传入请求 Request，与服务端交互后获得响应 Response。

#### Transport
```go
type Transport struct {
    // ...

    // 空闲连接map，实现复用
    idleConn map[connectMethodKey][]*persistConn // most recently used at end
    // ...
    
    // 新连接生成器
    DialContext func(ctx context.Context, network, addr string) (net.Conn, error)
    // ...
}
```
Transport 是 RoundTripper 的实现类

#### Request
```go
type Request struct {
    Method string
    URL *url.URL
    Header Header
    Body io.ReadCloser
    Host string
    Form url.Values
    Response *Response
    ctx context.Context
    // ...
}
```

#### Response
```go
type Response struct {
    StatusCode int // e.g. 200
    Proto string // e.g. "HTTP/1.0"
    Header Header
    Body io.ReadCloser
    Request *Request
    // ...
}
```

### 方法链路总览
客户端发起一次 http 请求大致分为几个步骤：
- 构造 http 请求参数
- 获取用于与服务端交互的 tcp 连接
- 通过 tcp 连接发送请求
- 通过 tcp 连接接收响应结果

![Client发起请求方法链路总览](https://b1ngsha-blog.oss-cn-beijing.aliyuncs.com/20250209150617.png)


### http.Post
调用 net/http 包下的公开方法 Post 时，需要传入服务端地址 url，请求参数格式 contentType 以及请求参数的 io reader。
方法中会使用包下的单例客户端 DefaultClient 来处理这个请求。
```go
var DefaultClient = &Client{}

func Post(url, contentType string, body io.Reader) (resp *Response, err error) {
    return DefaultClient.Post(url, contentType, body)
}
```

### Client.Post
在 Client.Post 方法中，首先会根据用户的入参，构造出完整的请求参数 Request；然后通过 Client.Do 方法来处理这个请求。
```go
func (c *Client) Post(url, contentType string, body io.Reader) (resp *Response, err error) {
    req, err := NewRequest("POST", url, body)
    // ...
    req.Header.Set("Content-Type", contentType)
    return c.Do(req)
}
```

### NewRequest
在 NewRequest 方法中，直接调用了 NewRequestWithContext 方法。
```go
func NewRequest(method, url string, body io.Reader) (*Request, error) {
    return NewRequestWithContext(context.Background(), method, url, body)
}
```
在 NewRequestWithContext 方法中，根据用户传入的 url、method 等信息，构造了 Request 实例。
```go
func NewRequestWithContext(ctx context.Context, method, url string, body io.Reader) (*Request, error) {
    // ...
    u, err := urlpkg.Parse(url)
    // ...
    rc, ok := body.(io.ReadCloser)
    // ...
    req := &Request{
        ctx: ctx,
        Method: method,
        URL: u,
        Proto: "HTTP/1.1",
        ProtoMajor: 1,
        ProtoMinor: 1,
        Header: make(Header),
        Body: rc,
        Host: u.Host,
    }
    // ...
    return req, nil
}
```

### Client.Do
发送请求时，经由 Client.Do -> Client.do 辗转，继而进入到 Client.send 方法中。
```go
func (c *Client) Do(req *Request) (*Response, error) {
    return c.do(req)
}
```

```go
func (c *Client) do(req *Request) (retres *Response, reterr error) {
    var (        
        deadline      = c.deadline()
        resp          *Response
        // ...
    )        
    for {
        // ...
        var err error
        if resp, didTimeout, err = c.send(req, deadline); err != nil {
            // ...
        }
        // ...
    }
}
```

在 Client.send 方法中，会在通过 send 方法发送请求之前和之后，分别对 cookie 进行更新。
```go
func (c *Client) send(req *Request, deadline time.Time) (resp *Response, didTimeout func() bool, err error) {
    // 设置cookie到请求头中
    if c.Jar != nil {
        for _, cookie := range c.Jar.Cookies(req.URL) {
            req.AddCookie(cookie)
        }
    }
    // 发送请求
    resp, didTimeout, err = send(req, c.transport(), deadline)
    if err != nil {
        return nil, didTimeout, err
    }
    // 更新resp的cookie到jar中 
    if c.Jar != nil {
        if rc := resp.Cookies(); len(rc) > 0 {
            c.Jar.SetCookies(req.URL, rc)
        }
    }
    return resp, nil, nil
}
```

在调用 send 方法时，需要传入 RoundTripper 实例，这里调用了 Client.transport 方法获取到这一实例：
```go
var DefaultTransport RoundTripper = &Transport{
    Proxy: ProxyFromEnvironment,
    DialContext: defaultTransportDialContext(&net.Dialer{
        Timeout: 30 * time.Second,
        KeepAlive: 30 * time.Second,
    }),
    ForceAttemptHTTP2: true,
    MaxIdleConns: 100,
    IdleConnTimeout: 90 * time.Second,
    TLSHandshakeTimeout: 10 * time.Second,
    ExpectContinueTimeout: 1 * time.Second,
}

func (c *Client) transport() RoundTripper {
    if c.Transport != nil {
        return c.Transport
    }
    return DefaultTransport
}
```
默认会使用全局单例 DefaultTransport。

在 send 方法内部，调用了 Transport.RoundTrip 方法处理核心的请求逻辑：
```go
func send(ireq *Request, rt RoundTripper, deadline time.Time) (resp *Response, didTimeout func() bool, err error) {
    // ...
    resp, err = rt.RoundTrip(req)
    // ...
    return resp, nil, nil
}

func (t *Transport) roundTrip(req *Request) (*Response, error) {
    // ...
    for {
        // ...
        treq := &transportRequest{Request: req, trace: trace, cancelKey: cancelKey}
        // ...
        pconn, err := t.getConn(treq, cm)
        // ...
        resp, err = pconn.roundTrip(treq)
        // ...
    }
}
```

### Transport.getConn
```go
func (t *Transport) getConn(treq *transportRequest, cm connectMethod) (_ *persistConn, err error) {
    req := treq.Request
    trace := treq.trace
    ctx := req.Context()
    if trace != nil && trace.GetConn != nil {
        trace.GetConn(cm.addr())
    }

    // 即使请求取消了还是会尝试获取连接
    // 因为未来可能会有请求可以复用这个连接
    dialCtx, dialCancel := context.WithCancel(context.WithoutCancel(ctx))

    w := &wantConn{
        cm: cm,
        key: cm.key(),
        ctx: dialCtx,
        cancelCtx: dialCancel,
        // type connOrError struct {  pc *persistConn  err error  idleAt time.Time  }
        result: make(chan connOrError, 1),
        beforeDial: testHookPrePendingDial,
        afterDial: testHookPostPendingDial,
    }
    // 如果获取连接失败，在wantConn.cancel方法中，会调用Transport.putOrCloseIdleConn方法尝试将连接放到队列中以供后续复用
    defer func() {
        if err != nil {
            w.cancel(t, err)
        }
    }()
    // 尝试复用指向相同服务端地址的空闲连接
    if delivered := t.queueForIdleConn(w); !delivered {
        // 如果没有获取到，则异步构造新连接
        t.queueForDial(w)
    }

    // 通过阻塞等待信号的方式，等待连接获取完成
    select {
    case r := <-w.result:
        // ...
        return r.pc, r.err
    // ...
    }
}
```
获取 tcp 连接的策略总体来看分为两步：
1. 通过 Transport.queueForIdleConn 方法，尝试复用采用相同协议、访问相同服务端的空闲连接；
2. 倘若无空闲连接，则通过 Transport.queueForDial 方法，异步创建一个新的连接，并通过接收 result channel 信号的方式，确认构造连接的工作已经完成。

#### 复用连接
```go
func (t *Transport) queueForIdleConn(w *wantConn) (delivered bool) {
    // 如果没有开启复用，直接返回false
    if t.DisableKeepAlives {
        return false
    }

    // 上锁，并发控制
    t.idleMu.Lock()
    defer t.idleMu.Unlock()

    // 停止关闭可复用的连接，因为在这里要取出其中的一个
    t.closeIdle = false

    if w == nil {
        // Happens in test hook.
        return false
    }

    // If IdleConnTimeout is set, calculate the oldest
    // persistConn.idleAt time we're willing to use a cached idle
    // conn.
    var oldTime time.Time
    if t.IdleConnTimeout > 0 {
        oldTime = time.Now().Add(-t.IdleConnTimeout)
    }

    if list, ok := t.idleConn[w.key]; ok {
        stop := false
        delivered := false
        for len(list) > 0 && !stop {
            // 取出最近使用的（队尾）的连接
            pconn := list[len(list)-1]

            // 检查这个连接是否已经被保存太久了
            tooOld := !oldTime.IsZero() && pconn.idleAt.Round(0).Before(oldTime)
            if tooOld {
                // 如果太老了，则起一个goroutine进行cleanup
                go pconn.closeConnIfStillIdle()
            }
            if pconn.isBroken() || tooOld {
                // 如果这个连接已经被persistConn.readLoop方法标记为broken了但是还没有被remove
                // 或者这个连接已经太老了
                // 则忽略，寻找下一个
                list = list[:len(list)-1]
                continue
            }
            // 找到后可用的连接后，调用wantConn.tryDeliver方法将其发送到result channel
            delivered = w.tryDeliver(pconn, nil, pconn.idleAt)
            if delivered {
                if pconn.alt != nil {
                    // HTTP/2: multiple clients can share pconn.
                    // Leave it in the list.
                } else {
                    // HTTP/1: only one client can use pconn.
                    // Remove it from the list.
                    t.idleLRU.remove(pconn)
                    list = list[:len(list)-1]
                }
            }
            stop = true
        }
        // 更新连接池
        if len(list) > 0 {
            t.idleConn[w.key] = list
        } else {
            delete(t.idleConn, w.key)
        }
        if stop {
            return delivered
        }
    }

    // Register to receive next connection that becomes idle.
    // 走到这里就代表没有获取到可复用的连接
    // 重新加入到等待队列中
    if t.idleConnWait == nil {
        t.idleConnWait = make(map[connectMethodKey]wantConnQueue)
    }
    q := t.idleConnWait[w.key]
    q.cleanFrontNotWaiting()
    q.pushBack(w)
    t.idleConnWait[w.key] = q
    return false
}
```

```go
func (w *wantConn) tryDeliver(pc *persistConn, err error, idleAt time.Time) bool {
    w.mu.Lock()
    defer w.mu.Unlock()

    if w.done {
        return false
    }
    if (pc == nil) == (err == nil) {
        panic("net/http: internal error: misuse of tryDeliver")
    }
    w.ctx = nil
    w.done = true

    w.result <- connOrError{pc: pc, err: err, idleAt: idleAt}
    close(w.result)

    return true
}
```
在复用连接这一步，主要包含了以下几个步骤：
1. 尝试从连接池（Transport.idleConn 集合）中获取指向同一服务端到空闲连接 persisConn；
2. 获取到连接后调用 wantConn.tryDeliver 方法将其发送到 wantConn.result 这个 channel 中；
3. 发送成功后，将 wantConn.result channel 关闭。

#### 创建连接
```go
func (t *Transport) queueForDial(w *wantConn) {
    // hook
    w.beforeDial()

    t.connsPerHostMu.Lock()
    defer t.connsPerHostMu.Unlock()

    if t.MaxConnsPerHost <= 0 {
        t.startDialConnForLocked(w)
        return
    }

    if n := t.connsPerHost[w.key]; n < t.MaxConnsPerHost {
        if t.connsPerHost == nil {
            t.connsPerHost = make(map[connectMethodKey]int)
        }
        t.connsPerHost[w.key] = n + 1
        t.startDialConnForLocked(w)
        return
    }

    if t.connsPerHostWait == nil {
        t.connsPerHostWait = make(map[connectMethodKey]wantConnQueue)
    }
    q := t.connsPerHostWait[w.key]
    q.cleanFrontNotWaiting()
    q.pushBack(w)
    t.connsPerHostWait[w.key] = q
}
```
Transport.queueForDial 会调用 Transport.startDialConnForLocked 方法执行创建连接的动作。

```go
func (t *Transport) startDialConnForLocked(w *wantConn) {
    t.dialsInProgress.cleanFrontCanceled()
    t.dialsInProgress.pushBack(w)
    go func() {
        t.dialConnFor(w)
        t.connsPerHostMu.Lock()
        defer t.connsPerHostMu.Unlock()
        w.cancelCtx = nil
    }()
}
```
在 Transport.startDialConnForLocked 方法会异步调用 Transport.dialConnFor 方法，创建新的 tcp 连接。
这里之所以采用异步操作创建连接，有两部分原因：
- 一个 tcp 连接并不是一个静态的数据结构，它是有生命周期的，创建过程中会为其创建负责读写的两个守护协程，伴随而生
- 在上游的 Transport.getConn 方法中，当通过 select 多路复用的方式，接收到其他终止信号时，可以提前调用 wantConn.cancel 方法打断创建连接的 goroutine。相比于串行化执行而言，这种异步交互的模式，具有更高的灵活度

```go
func (t *Transport) dialConnFor(w *wantConn) {
    // ...
    pc, err := t.dialConn(ctx, w.cm)
    delivered := w.tryDeliver(pc, err, time.Time{})
    // ...
}
```
Transport.dialConnFor 方法中，首先调用 Transport.dialConn 方法创建 tcp 连接 persistConn，接着执行 wantConn.tryDeliver 方法，将连接写入 result channel 并唤醒上游进行读取。

```go
func (t *Transport) dialConn(ctx context.Context, cm connectMethod) (pconn *persistConn, err error) {
    pconn = &persistConn{
        t: t,
        cacheKey: cm.key(),
        reqch: make(chan requestAndChan, 1),
        writech: make(chan writeRequest, 1),
        closech: make(chan struct{}),
        writeErrCh: make(chan error, 1),
        writeLoopDone: make(chan struct{}),
    }
    // ...
    conn, err := t.dial(ctx, "tcp", cm.addr())
    // ...
    pconn.conn = conn

    // ...
    go pconn.readLoop()
    go pconn.writeLoop()
    return pconn, nil
}
```
Transport.dialConn 方法中包含了创建连接的核心逻辑：
- 调用 Transport.dial 方法，最终通过 Transport.DialContext 和 Transport.Dial 方法创建 tcp 连接
- 异步启动连接的伴生读写协程 readLoop 和 writeLoop 方法，组成提交请求、接收响应的循环

```go
func (t *Transport) dial(ctx context.Context, network, addr string) (net.Conn, error) {
    if t.DialContext != nil {
        c, err := t.DialContext(ctx, network, addr)
        if c == nil && err == nil {
            err = errors.New("net/http: Transport.DialContext hook returned (nil, nil)")
        }
        return c, err
    }
    if t.Dial != nil {
        c, err := t.Dial(network, addr)
        if c == nil && err == nil {
            err = errors.New("net/http: Transport.Dial hook returned (nil, nil)")
        }
        return c, err
    }
    return zeroDialer.DialContext(ctx, network, addr)
}
```

在伴生读协程 persistConn.readLoop 方法中，会读取来自服务端的响应，并添加到 persistConn.reqCh.ch 中，供上游的 persistConn.roundTrip 方法接收。
```go
func (pc *persistConn) readLoop() {
    // ...
    alive := true
    for alive { 
        // ...
        rc := <pc.reqch
        // ...
        var resp *Response
        // ...
        resp, err = pc.readResponse(rc, trace)
        // ...
        select {
        case rc.ch <- responseAndError{res: resp}:
            // ...
        }
        // ...
    }
}
```

```go
func (pc *persistConn) roundTrip(req *transportRequest) (resp *Response, err error) {
    // ...
    resc := make(chan responseAndError)
    pc.reqch <- requestAndChan{
        treq: req,
        ch: resc,
        addedGzip: requestedGzip,
        continueCh: continueCh,
        callerGone: gone,
    }

    handleResponse := func(re responseAndError) (*Response, error) {
        if (re.res == nil) == (re.err == nil) {
            panic(fmt.Sprintf("internal error: exactly one of res or err should be set; nil=%v", re.res == nil))
        }
        if debugRoundTrip {
            req.logf("resc recv: %p, %T/%#v", re.res, re.err, re.err)
        }
        if re.err != nil {
            return nil, pc.mapRoundTripError(req, startBytesWritten, re.err)
        }
        return re.res, nil
    }
    // ...
    for {
        // ...
        select {
        case re := <-resc:
            return handleResponse(re)
        // ...
        }
    }
}
```

在伴生写协程 persistConn.writeLoop 方法中，会通过 persistConn.writech 方法读取到客户端提交的请求，然后将其发送到服务器。
```go
func (pc *persistConn) writeLoop() {
    defer close(pc.writeLoopDone)
    for {
        select {
        case wr := <-pc.writech:
            // ...
            err := wr.req.Request.write(pc.bw, pc.isProxy, wr.req.extra, pc.waitForContinue(wr.continueCh))
        }
        // ...
    }
}
```

```go
func (pc *persistConn) roundTrip(req *transportRequest) (resp *Response, err error) {
    pc.writech <- writeRequest{req, writeErrCh, continueCh}
}
```
#### 暂存连接
有连接复用的能力，就必然存在存储连接的机制。
首先，在构造新连接中途，倘若被打断，则可能会将连接放回队列以供复用：
```go
func (t *Transport) getConn(treq *transportRequest, cm connectMethod) (pc *persistConn, err error) {
    // ...
    // 倘若连接获取失败，在wantConn.cancel方法中，会尝试将tcp连接放回队列中以供后续复用
    defer func() {
        if err != nil {
            w.cancel(t, err)
        }
    }()
    // ...
}
```

```go
func (w *wantConn) cancel(t *Transport, err error) {
    w.mu.Lock()
    var pc *persistConn
    if w.done {
        if r, ok := <-w.result; ok {
            pc = r.pc
        }
    } else {
        close(w.result)
    }
    w.ctx = nil
    w.done = true
    w.mu.Unlock()

    if pc != nil {
        t.putOrCloseIdleConn(pc)
    }
}
```

```go
func (t *Transport) putOrCloseIdleConn(pconn *persistConn) {
    if err := t.tryPutIdleConn(pconn); err != nil {
        pconn.close(err)
    }
}
```

```go
func (t *Transport) tryPutIdleConn(pconn *persistConn) error {
    // ...
    key := pconn.cacheKey
    // ...
    t.idleConn[key] = append(idles, pconn)
    // ...
    return nil
}
```

其次，倘若与服务端的一轮交互流程结束，也会将连接放回队列以供复用：
```go
func (pc *persistConn) readLoop() {
    tryPutIdleConn := func(trace *httptrace.ClientTrace) bool {
        if err := pc.t.tryPutIdleConn(pc); err != nil {
            // ...
        }
        // ...
    }
    // ...
    alive := true
    for alive {
        // ...
        select {
        case bodyEOF := <waitForBodyRead:
            alive = alive &&
                bodyEOF &&
                !pc.sawEOF &&
                pc.wroteRequest() &&
                tryPutIdleConn(rc.treq)
            // ...
        }
    }
}
```

### persistConn.roundTrip
在上一个小节中提到：一个连接 persistConn 是一个具有生命特征的角色。它本身伴有 readLoop 和 writeLoop 两个守护协程，与上游应用者之间通过 channel 进行读写交互。
而其中扮演应用者这一角色的，正是本小节谈到的主流程中的方法：persistConn.roundTrip。
- 它首先将 http 请求通过 persistConn.writech 发送给连接的守护协程 writeLoop，并进一步传送到服务端
- 其次通过读取 persistConn.reqch.ch channel，接收由守护协程 readLoop 代理转发的客户端响应数据
```go
func (pc *persistConn) roundTrip(req *transportRequest) (resp *Response, err error) {
    // ...   
    pc.writech <- writeRequest{req, writeErrCh, continueCh}
    resc := make(chan responseAndError)
    pc.reqch <- requestAndChan{
        req:        req.Request,
        cancelKey:  req.cancelKey, 
        ch:         resc,
        // ...
    }
    // ...
    for {
        select {
        // ...
        case re := <resc:
        // ...
        return re.res, nil
        // ...
        }
    }
}
```