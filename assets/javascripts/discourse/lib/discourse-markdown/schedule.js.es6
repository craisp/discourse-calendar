import { registerOption } from "pretty-text/pretty-text";

const DATA_PREFIX = "data-schedule-";
const WHITELISTED_ATTRIBUTES = ["title", "all_day", "start_date_time", "end_date_time", "timezone_offset"];
const ATTRIBUTES_REGEX = new RegExp("(" + WHITELISTED_ATTRIBUTES.join("|") + ")=(['\"][\\S\\s\^\\]]+['\"]|['\"]?[^\\s\\]]+['\"]?)", "g");
const VALUE_REGEX = new RegExp("^['\"]?([\\s\\S]+)['\"]?$", "g");

registerOption((siteSettings, opts) => {
  opts.features.schedule = siteSettings.calendar_enabled;
});

export function setup(helper) {
  helper.whiteList([
    "div.discourse-calendar-schedule discourse-ui-card",
    "div[data-schedule-*]",
    "div.content",
    "div.schedule-date-time content",
    "div.extra content",
    "div.header"
  ]);

  helper.replaceBlock({
    start: new RegExp("\\[schedule((?:\\s+(?:" + WHITELISTED_ATTRIBUTES.join("|") + ")=(?:['\"][^\\n]+['\"]|[^\\s\\]]+))+)\\]([\\s\\S]*)", "igm"),
    stop: /\[\/schedule\]/igm,

    emitter(blockContents, matches) {
      const attributes = { "class": "discourse-calendar-schedule discourse-ui-card" };
      const contents = [];

      if (blockContents.length){
        const postProcess = bc => {
          if (typeof bc === "string" || bc instanceof String) {
            const processed = this.processInline(String(bc));
            if (processed.length) {
              contents.push(["p"].concat(processed));
            }
          } else {
            contents.push(bc);
          }
        };

        let b;
        while ((b = blockContents.shift()) !== undefined) {
          this.processBlock(b, blockContents).forEach(postProcess);
        }
      }


      const title = [];
      const duration = ["div", {"class": "schedule-date-time content"}];
      const extraContents = ["div", {"class": "extra content"}];
      let startDateTime;
      let endDateTime;
      let timezoneOffset;
      let allDay = false;
      let startEndRange = " ~ ";
      (matches[1].match(ATTRIBUTES_REGEX) || []).forEach(function(m) {
        const idx = m.indexOf("=");
        const name = m.substring(0, idx);
        let value = m.substring(idx+1);

        if(value.indexOf("'") == 0 && value.lastIndexOf("'") == (value.length - 1) || value.indexOf("\"") == 0 && value.lastIndexOf("\"") == (value.length -1)){
          value = value.substring(1, value.length-1);
        }

        const escaped = helper.escape(value);
        switch (name) {
          case "title":
            if(escaped) title.push("div", {"class": "content"}, ["div", {"class": "header"}, escaped]);
            break;

          case "start_date_time":
            startDateTime = escaped;
            break;

          case "end_date_time":
            endDateTime = escaped;
            break;

          case "all_day":
            allDay = (escaped === "true");
            break;

          case "timezone_offset":
            timezoneOffset = escaped;
            break;
        }
      });

      // // const calendar_locale = helper.getOptions().calendarLocale;
      // const calendar_locale = 'de-DE';
      // let startObject = allDay ? moment(startDateTime) : moment(startDateTime + timezoneOffset);
      // let endObject = allDay ? moment(endDateTime) : moment(endDateTime + timezoneOffset);
      // const sameDay = (startObject.isSame(endObject, 'day'));
      // let formatStart = 'LL';
      // let formatEnd = 'LL';
      // if (!allDay) {
      //   formatStart = 'LLL';
      //   if (sameDay) {
      //     formatEnd = 'LT';
      //   } else {
      //     formatEnd = 'LLL';
      //   }
      // }
      //
      // if (sameDay && allDay) {
      //   startEndRange = startObject.locale(calendar_locale).format(formatStart);
      // } else {
      //   startEndRange = startObject.locale(calendar_locale).format(formatStart).concat(startEndRange).concat(endObject.locale(calendar_locale).format(formatEnd));
      // }

      if(allDay) {
        startDateTime = new Date(startDateTime);
        endDateTime = new Date(endDateTime);
        startEndRange = startDateTime.toUTCString().split(" ").slice(0, 4).join(" ").concat(startEndRange).concat(endDateTime.toUTCString().split(" ").slice(0, 4).join(" "));
      }else{
        startDateTime = new Date(startDateTime + timezoneOffset);
        endDateTime = new Date(endDateTime + timezoneOffset);
        startEndRange = startDateTime.toDateString().concat(" ".concat(startDateTime.toLocaleTimeString())).concat(startEndRange).concat(endDateTime.toDateString().concat(" ".concat(endDateTime.toLocaleTimeString())));
      }

      if(!startDateTime || isNaN(startDateTime.getDate()) || (endDateTime && isNaN(endDateTime.getDate()))){
        return ["div"].concat(contents);
      }

      attributes[DATA_PREFIX + "start"] = startDateTime.getTime().toString();
      attributes[DATA_PREFIX + "end"] = endDateTime.getTime().toString();
      attributes[DATA_PREFIX + "all-day"] = allDay.toString();

      const schedule = ["div", attributes];

      if(title.length > 0) schedule.push(title);
      duration.push(startEndRange);
      schedule.push(duration);

      if(contents && contents.length > 0){
        extraContents.push(contents[0]);
        schedule.push(extraContents);
      }

      return schedule;
    }
  });
}
