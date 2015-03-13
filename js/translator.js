function Translator(language) {
    this.language = language;
}

Translator.prototype.days = {English: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]};
Translator.prototype.months = {English: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]};

Translator.prototype.trDay = function (day_int) {
        return this.days[this.language][day_int];
    };

Translator.prototype.trMonth = function (month_int) {
        return this.months[this.language][month_int];
    };
