#!/usr/bin/env python3


from collections import namedtuple
import json
import os
import sys


Bundle = namedtuple('Bundle' , 'seq ext bundleName totalBytes files')

Diff = namedtuple('Diff', 'status path oldBytes newBytes isBigger diff')
BundleDiff = namedtuple('BundleDiff', 'total files')


class Status:
    added    = 'added'
    modified = 'modified'
    deleted  = 'deleted'


def humanize(nbytes):
    suffixes = ['B', 'KB', 'MB']
    i = 0
    while abs(nbytes) >= 1024 and i < len(suffixes)-1:
        nbytes /= 1024.
        i += 1
    f = ('%.1f' % nbytes).rstrip('0').rstrip('.')
    return '%s %s' % (f, suffixes[i])


def normalizePath(path):
    if path.startswith('node_modules/') or '/node_modules/' in path:
        mod = path.partition('/node_modules/')[2].split('/')
        if mod[0].startswith('@'):
            return '/'.join(mod[0:2])
        return mod[0]
    return path


def mergeFiles(allFiles):
    files = {}
    for path, meta in allFiles.items():
        np = normalizePath(path)
        p = os.path.dirname(np) or np
        if p not in files:
            files[p] = 0
        files[p] += meta['size']
    return files


def readBundle(path):
    bundles = []
    with open(path) as f:
        data = json.load(f)
        for result in data['results']:
            filename = os.path.basename(result['bundleName'])
            seq = filename.split('.')[0]
            _, ext = os.path.splitext(filename)
            bundle = Bundle(
                seq=seq,
                ext=ext,
                bundleName=result['bundleName'],
                totalBytes=result['totalBytes'],
                files=mergeFiles(result['files']))
            bundles.append(bundle)
    return bundles


def printRow(diff, element):
    if diff.status == Status.added:
        status = '+'
    elif diff.status == Status.modified:
        status = 'M'
    else:
        status = '-'

    sign = '+' if diff.isBigger else ''
    ob = humanize(diff.oldBytes) if diff.oldBytes > 0 else ''
    nb = humanize(diff.newBytes) if diff.newBytes > 0 else ''

    return '''<tr>
            <{element}>{status}</{element}>
            <{element}>{path}</{element}>
            <{element}>{ob}</{element}>
            <{element}>{nb}</{element}>
            <{element}>{sign}{diff}</{element}>
        </tr>'''.format(
            element=element,
            status=status, path=diff.path,
            ob=ob, nb=nb,
            sign=sign, diff=humanize(diff.diff))


def printBundleTable(diffs, element):
    rows = []
    for diff in diffs:
        rows.append(printRow(diff, element))
    return '<table><tbody>{body}</tbody></table>'.format(body='\n'.join(rows))


def printBundleDiff(bundleDiff):
    summary = printBundleTable([bundleDiff.total], 'th')
    details = printBundleTable(bundleDiff.files, 'td')

    return '''
<details>
    <summary>{summary}</summary>
    {details}
</details>
'''.format(summary=summary, details=details)


def makeDiff(path, oldBytes, newBytes):
    if oldBytes > 0 and newBytes > 0:
        status = Status.modified
    elif oldBytes == 0:
        status = Status.added
    else:
        status = Status.deleted
    return Diff(
        status=status,
        path=path,
        oldBytes=oldBytes,
        newBytes=newBytes,
        isBigger=newBytes > oldBytes,
        diff=newBytes - oldBytes,
    )


def diffBundle(ba, bb):
    filesDiffs = []
    diff = bb.totalBytes - ba.totalBytes
    if abs(diff) > 500:
        totalDiff = makeDiff(ba.bundleName, ba.totalBytes, bb.totalBytes)

        for aFile in ba.files:
            aSize = ba.files[aFile]
            if aFile in bb.files:
                bSize = bb.files[aFile]
                if aSize != bSize:
                    filesDiffs.append(makeDiff(aFile, aSize, bSize))
            else:
                filesDiffs.append(makeDiff(aFile, aSize, 0))

        for bFile in bb.files:
            bSize = bb.files[bFile]
            if bFile not in ba.files:
                filesDiffs.append(makeDiff(bFile, 0, bSize))

        return BundleDiff(total=totalDiff, files=filesDiffs)


def summarize(diffs):
    totalDiff = 0
    for diff in diffs:
        totalDiff += diff.total.diff
    sign = '+' if totalDiff > 0 else ''
    return '### Total diff: {sign}{totalDiff}'.format(
        sign=sign, totalDiff=humanize(totalDiff))


def printDiff(diffs):
    rows = []
    for diff in diffs:
        rows.append(printBundleDiff(diff))
    summary = summarize(diffs)
    print('{summary}\n{rows}'.format(summary=summary, rows='\n'.join(rows)))


def diffBundles(a, b):
    diffs = []
    for ba in a:
        found = False
        for bb in b:
            if ba.seq == bb.seq and ba.ext == bb.ext:
                found = True
                d = diffBundle(ba, bb)
                if d:
                    diffs.append(d)
                break
        if not found:
            bb = Bundle(
                    seq=ba.seq,
                    ext=ba.ext,
                    bundleName=ba.bundleName,
                    totalBytes=0,
                    files={}
            )
            d = diffBundle(ba, bb)
            if d:
                diffs.append(d)

    for bb in b:
        found = False
        for ba in a:
            if bb.seq == ba.seq and ba.ext == bb.ext:
                found = True
        if not found:
            ba = Bundle(
                    seq=bb.seq,
                    ext=bb.ext,
                    bundleName=bb.bundleName,
                    totalBytes=0,
                    files={}
            )
            d = diffBundle(ba, bb)
            if d:
                diffs.append(d)

    diffs.sort(key=lambda x: x.total.newBytes, reverse=True)
    return diffs


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: PATH1 PATH2')
        sys.exit(1)

    bundleA = readBundle(sys.argv[1])
    bundleB = readBundle(sys.argv[2])

    if not bundleA or not bundleB:
        print('Usage: PATH1 PATH2')
        sys.exit(1)

    diffs = diffBundles(bundleA, bundleB)
    if diffs:
        printDiff(diffs)
