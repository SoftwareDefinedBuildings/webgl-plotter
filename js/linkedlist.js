function ListNode(entry, next, prev) {
    this.elem = entry;
    this.next = next || null;
    this.prev = prev || null;
}

function LinkedList() {
    this.head = null;
    this.tail = null;
    this.len = 0;
}

LinkedList.prototype.push = function (entry) {
        var listnode;
        if (this.len == 0) {
            listnode = new ListNode(entry);
            this.head = listnode;
            this.tail = listnode;
        } else {
            listnode = new ListNode(entry, null, this.tail);
            this.tail.next = listnode;
            this.tail = listnode;
        }
        this.len++;
        return listnode;
    };

LinkedList.prototype.unshift = function (entry) {
        var listnode;
        if (this.len == 0) {
            listnode = new ListNode(entry);
            this.head = listnode;
            this.tail = listnode;
        } else {
            listnode = new ListNode(entry, this.head);
            this.head.prev = listnode;
            this.head = listnode;
        }
        this.len++;
        return listnode;
    };
    
LinkedList.prototype.removeNode = function (node) {
        if (node.next !== null) {
            node.next.prev = node.prev;
        }
        if (node.prev !== null) {
            node.prev.next = node.next;
        }
        if (this.head == node) {
            this.head = node.next;
        } else if (this.tail == node) {
            this.tail = node.prev;
        }
        this.len--;
        return node;
    };
