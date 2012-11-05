function Set(values) {
  if (!(this instanceof Set))
    return new Set(values);
  this._values = {};
  if (values)
    values.map(this.add.bind(this));
}

Set.prototype.add = function add(thing) {
  var exists = this.has(thing);
  var key;
  if (!exists) {
    key = JSON.stringify(thing);
    this._values[key] = thing;
  }
  return !exists;
};

Set.prototype.remove = function remove(thing) {
  var key;
  if (!this.has(thing))
    return false;
  key = JSON.stringify(thing);
  delete this._values[key];
  return true;
};

Set.prototype.values = function values() {
  return Object.keys(this._values).map(JSON.parse);
};

Set.prototype.has = function has(thing) {
  var key = JSON.stringify(thing);
  return this._values.hasOwnProperty(key);
};

function clone(ary) {
  return ary.slice();
}

function arrayAdd(ary1, ary2) {
  var other;
  var result = clone(
    ary1.length > ary2.length
      ? (other = ary2, ary1)
      : (other = ary1, ary2)
  );
  result.push.apply(result, other);
  return result;
}

Set.prototype.union = function union(other) {
  var vals = arrayAdd(this.values(), other.values());
  return new Set(vals);
};

Set.prototype.intersection = function intersection(other) {
  var these = this.values();
  var values = these.filter(other.has.bind(other));
  return new Set(values);
};

module.exports = Set;