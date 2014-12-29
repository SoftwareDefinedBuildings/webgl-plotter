/* Performs binary search on SORTEDLST to find the index of item whose key is
   ITEM. KEY is a function that takes an element of the list as an argument and
   returns its key. If ITEM is not the key of any of the items in SORTEDLST,
   one of the indices closest to the index where it would be is returned. */
function binSearch(sortedLst, item, key) {
    var currVal;
    var low = 0;
    var high = sortedLst.length - 1;
    var i;
    while (low < high) {
        i = Math.floor((low + high) / 2);
        currVal = key(sortedLst[i]);
        if (currVal < item) {
            low = i + 1;
        } else if (currVal > item) {
            high = i - 1;
        } else {
            return i;
        }
    }
    return low;
}

