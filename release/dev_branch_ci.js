/*
 * Copyright (c) 2026-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or
 * without modification, are permitted provided that the following conditions
 * are met:
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * - Neither the name of salesforce.com, inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission of salesforce.com, inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * The declared PR workflows use block event mappings and inline branch lists.
 * Limit edits to that format and reject unsupported filters rather than guess
 * at YAML semantics. Never apply SDK pointer rewrites to the default branch.
 */
function planPrWorkflow(content, event, branch) {
    const unsupported = () => { throw new Error('Unsupported PR trigger format; review the workflow manually') }
    if (!/^[\w][\w.\-/]*$/.test(branch)) unsupported()
    const lines = content.split('\n')
    const onKeys = lines.map((line, i) => ({line, i}))
        .filter(({line}) => /^(?:on|'on'|"on"):\s*(?:#.*)?$/.test(line))
    if (onKeys.length !== 1) unsupported()
    const on = onKeys[0].i
    let end = on + 1
    while (end < lines.length && !/^[^\s#]/.test(lines[end])) end++
    const triggers = lines.slice(on + 1, end)
    const events = triggers.map((line, i) => ({line, i}))
        .filter(({line}) => new RegExp(`^  ${event}:\\s*(?:#.*)?$`).test(line))
    if (events.length !== 1) unsupported()
    const start = events[0].i
    let stop = start + 1
    while (stop < triggers.length && !/^  [^\s#]/.test(triggers[stop])) stop++
    const fields = triggers.slice(start + 1, stop)
    if (fields.some(line => /^    [^\s#]/.test(line)
        && !/^    (?:branches|paths|paths-ignore|types):/.test(line))) unsupported()
    if (fields.some(line => /^\s+<<:/.test(line))) unsupported()
    if (fields.some(line => /^\s+(?:branches-ignore|['"]branches(?:-ignore)?['"]):/.test(line))) unsupported()
    if (fields.some(line => /^\s+branches:/.test(line) && !/^    branches:/.test(line))) unsupported()
    const filters = fields.map((line, i) => ({line, i})).filter(({line}) => /^    branches:/.test(line))
    if (filters.length === 0) return {ready: true, content}
    if (filters.length !== 1) unsupported()
    const {line, i} = filters[0]
    const match = line.match(/^(    branches:\s*\[)([^\]]*)(\]\s*(?:#.*)?)$/)
    if (!match) unsupported()
    const tokens = match[2].trim() ? match[2].split(',').map(value => value.trim()) : []
    const names = tokens.map(token => {
        if (token.startsWith('*')) unsupported()
        const scalar = token.match(/^(?:'([\w./*?+@{}-]+)'|"([\w./*?+@{}-]+)"|([\w./*?+@{}-]+))$/)
        if (!scalar) unsupported()
        return scalar[1] || scalar[2] || scalar[3]
    })
    if (names.includes(branch)) return {ready: true, content}
    const master = names.indexOf('master')
    tokens.splice(master === -1 ? tokens.length : master, 0, branch)
    lines[on + 1 + start + 1 + i] = match[1] + tokens.join(', ') + match[3]
    return {ready: false, content: lines.join('\n')}
}

module.exports = {planPrWorkflow}
