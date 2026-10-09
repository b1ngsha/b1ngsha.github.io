#!/usr/bin/env python3
"""One-off (already run; kept for the record): Hexo `source/_posts` -> Astro `src/content/posts`.

Reads each post, normalises the front matter (series, part, tags, ISO date),
keeps the body byte-for-byte, and writes:
  - src/content/posts/<series|misc>/<slug>.md
  - src/data/redirects.json   (old Hexo URL -> new URL)
  - docs/migration/slug-table.md  (for review)
Run from the repo root:  python3 docs/migration/migrate-hexo.py /tmp/old-urls.txt
"""
import json, os, re, sys
import yaml

SRC = 'source/_posts'
OUT = 'src/content/posts'

# (folder/file) -> (slug, series, part)
M = {
 'cpp/smart_ptr': ('cpp-smart-pointers','modern-cpp',1),
 'cpp/rval_mv': ('cpp-rvalue-and-move','modern-cpp',2),
 'cpp/container1': ('cpp-containers-1','modern-cpp',3),
 'cpp/container2': ('cpp-containers-2','modern-cpp',4),
 'cpp/exception': ('cpp-exceptions','modern-cpp',5),
 'cpp/ez1': ('cpp-usability-1-auto-and-init','modern-cpp',6),
 'cpp/iterator': ('cpp-iterators-and-range-for','modern-cpp',7),
 'cpp/ez2': ('cpp-usability-2-literals-and-specifiers','modern-cpp',8),
 'cpp/return_val': ('cpp-return-objects','modern-cpp',9),
 'cpp/template': ('cpp-compile-time-polymorphism','modern-cpp',10),
 'cpp/template1': ('cpp-compile-time-computation','modern-cpp',11),
 'cpp/sfinae': ('cpp-sfinae','modern-cpp',12),
 'cpp/constexpr': ('cpp-constexpr','modern-cpp',13),
 'DesignPatterns/FactoryMethod': ('pattern-factory-method','design-patterns',1),
 'DesignPatterns/AbstractFactory': ('pattern-abstract-factory','design-patterns',2),
 'DesignPatterns/Builder': ('pattern-builder','design-patterns',3),
 'DesignPatterns/Singleton': ('pattern-singleton','design-patterns',4),
 'DesignPatterns/Prototype': ('pattern-prototype','design-patterns',5),
 'Golang/golang_basic': ('go-getting-started','go',1),
 'Golang/net_http_source': ('go-net-http-source','go',2),
 'Golang/context': ('go-context-source','go',3),
 'Golang/channel': ('go-channel-source','go',4),
 'Kubernetes/1': ('k8s-preview','kubernetes',1),
 'Kubernetes/2': ('k8s-container-basics-1-process','kubernetes',2),
 'Kubernetes/3': ('k8s-container-basics-2-isolation','kubernetes',3),
 'Kubernetes/4': ('k8s-container-basics-3-image','kubernetes',4),
 'Kubernetes/5': ('k8s-container-basics-4-docker-container','kubernetes',5),
 'Kubernetes/6': ('k8s-from-container-to-cloud','kubernetes',6),
 'Kubernetes/7': ('k8s-build-a-cluster','kubernetes',7),
 'Kubernetes/8': ('k8s-first-containerized-app','kubernetes',8),
 'Kubernetes/9': ('k8s-kubeadm','kubernetes',9),
 'Kubernetes/10': ('k8s-why-pod','kubernetes',10),
 'Kubernetes/11': ('k8s-pod-1-basics','kubernetes',11),
 'Kubernetes/12': ('k8s-pod-2-advanced','kubernetes',12),
 'Kubernetes/13': ('k8s-controller-model','kubernetes',13),
 'Kubernetes/14': ('k8s-deployment-and-scaling','kubernetes',14),
 'Kubernetes/15': ('k8s-statefulset-1-topology','kubernetes',15),
 'Kubernetes/16': ('k8s-statefulset-2-storage','kubernetes',16),
 'Kubernetes/17': ('k8s-statefulset-3-practice','kubernetes',17),
 'Kubernetes/18': ('k8s-daemonset','kubernetes',18),
 'Kubernetes/19': ('k8s-job-cronjob','kubernetes',19),
 'Kubernetes/20': ('k8s-declarative-api','kubernetes',20),
 'Kubernetes/21': ('k8s-api-objects','kubernetes',21),
 'makefile/makefile_introduction': ('makefile-introduction','makefile',1),
 'makefile/makefile_rules': ('makefile-rules','makefile',2),
 'makefile/makefile_commands': ('makefile-commands','makefile',3),
 'MissingSemester/Lecture1': ('ms-1-the-shell','missing-semester',1),
 'MissingSemester/Lecture2': ('ms-2-shell-tools-and-scripting','missing-semester',2),
 'MissingSemester/Lecture3': ('ms-3-editors-vim','missing-semester',3),
 'MissingSemester/Lecture4': ('ms-4-data-wrangling','missing-semester',4),
 'MissingSemester/Lecture5': ('ms-5-command-line-environment','missing-semester',5),
 'MissingSemester/Lecture6': ('ms-6-version-control-git','missing-semester',6),
 'MissingSemester/Lecture7': ('ms-7-debugging-and-profiling','missing-semester',7),
 'MissingSemester/Lecture8': ('ms-8-metaprogramming','missing-semester',8),
 'MissingSemester/Lecture9': ('ms-9-security-and-cryptography','missing-semester',9),
 'MissingSemester/Lecture10': ('ms-10-potpourri','missing-semester',10),
 'Python/MultipleInheritanceInPython': ('python-mro',None,None),
 'RabbitMQ/RabbitMQTutorial': ('rabbitmq-tutorials',None,None),
 'Rafactoring/Refactoring': ('refactoring','refactoring',1),
 'Rafactoring/RefactoringTechniques': ('refactoring-techniques','refactoring',2),
 'rust/getting_started': ('rust-getting-started','rust',1),
 'rust/programming_a_guessing_game': ('rust-guessing-game','rust',2),
 'rust/common_programming_concepts': ('rust-common-concepts','rust',3),
 'rust/understanding_ownership': ('rust-ownership','rust',4),
 'rust/using_structs_to_structure_related_data': ('rust-structs','rust',5),
 'rust/enums_and_pattern_matching': ('rust-enums-and-pattern-matching','rust',6),
 'rust/packages_crates_modules': ('rust-packages-crates-modules','rust',7),
 'rust/common_collections': ('rust-collections','rust',8),
 'rust/error_handling': ('rust-error-handling','rust',9),
 'rust/generic_types_traits_lifetimes': ('rust-generics-traits-lifetimes','rust',10),
 'rust/writing_automated_tests': ('rust-automated-tests','rust',11),
 'security/XSS&CSRF&SQLInjection': ('web-security-xss-csrf-sqli',None,None),
 'Tips/ATipInSpringIOC': ('spring-ioc-tip',None,None),
 'YearSummary/2025': ('annual-summary-2025',None,None),
}
# tags that only repeat a series (or carry no information) are dropped
DROP = {'kubernetes','c++','rust','missing semester','design patterns','creational patterns','golang',
        'makefile','make','refactoring','tutorials','tips','annaual summary'}
RENAME = {'annual summary': 'annual'}
EXTRA = {'annual-summary-2025': ['annual']}

def q(s): return json.dumps(s, ensure_ascii=False)

old = [l.strip() for l in open(sys.argv[1]) if l.strip()]
old_by_key = {}
for u in old:                       # 2025/02/01/Kubernetes/1
    parts = u.split('/')
    old_by_key['/'.join(parts[3:])] = u

rows, redirects = [], {}
assert len(M) == 74, len(M)
for key, (slug, series, part) in M.items():
    p = os.path.join(SRC, key + '.md')
    s = open(p, encoding='utf8').read()
    m = re.match(r'---\n(.*?)\n---\n?', s, re.S)
    fm, body = yaml.safe_load(m.group(1)), s[m.end():]
    date = str(fm['date'])
    date = date.replace(' ', 'T') + '+08:00'
    tags = fm.get('tags') or []
    tags = [tags] if isinstance(tags, str) else tags
    kept = []
    for t in map(str, tags):
        t = t.strip()
        tl = t.lower()
        if tl in DROP: continue
        tl = RENAME.get(tl, tl)
        if tl not in kept: kept.append(tl)
    for t in EXTRA.get(slug, []):
        if t not in kept: kept.append(t)
    lines = ['---', f'title: {q(str(fm["title"]).strip())}', f'date: {date}']
    if series: lines += [f'series: {series}', f'part: {part}']
    if kept: lines.append('tags: [' + ', '.join(kept) + ']')
    lines.append('---')
    out_dir = os.path.join(OUT, series or 'misc')
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, slug + '.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n' + body)
    ou = old_by_key[key]
    redirects['/' + ou + '/'] = f'/posts/{slug}/'
    rows.append((date[:10], f'/{ou}/', f'/posts/{slug}/', series or '—', part or '', ', '.join(kept) or '—', str(fm['title']).strip()))

os.makedirs('src/data', exist_ok=True)
json.dump(dict(sorted(redirects.items())), open('src/data/redirects.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
rows.sort(key=lambda r: (r[3], r[4] if r[4] != '' else 0, r[0]))
with open('docs/migration/slug-table.md', 'w', encoding='utf8') as f:
    f.write('# 文章迁移对照表\n\n老网址 → 新网址、系列、序号、标签。确认前不要合并。\n\n')
    f.write('| 新网址 | 系列 | 序号 | 标签 | 标题 | 老网址 |\n|---|---|---|---|---|---|\n')
    for d, o, n, se, pa, ta, ti in rows:
        f.write(f'| `{n}` | {se} | {pa} | {ta} | {ti} | `{o}` |\n')
print('posts', len(rows), 'redirects', len(redirects))
