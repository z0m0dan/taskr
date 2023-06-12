export const validateTaskInput = (value: {
  title: string;
  dueTime: string;
}) => {
  if (!value || !value.title || !value.dueTime) {
    return {
      ok: false,
      message: "Some of the fields are empty",
    };
  }

  if (value.title.length <= 0 || value.dueTime.length <= 0) {
    return {
      ok: false,
      message: "Some of the fields are empty",
    };
  }

  if (!value.title.match(/^[0-9]+[h|m]$/)) {
    if (
      value.title.includes("h") &&
      parseInt(value.title.split("h")[0]) > 24 &&
      parseInt(value.title.split("h")[0]) < 0
    ) {
      return {
        ok: false,
        message: "Invalid hour value",
      };
    }
    if (
      value.title.includes("m") &&
      parseInt(value.title.split("m")[0]) > 60 &&
      parseInt(value.title.split("m")[0]) < 0
    ) {
      //validate that the minutes are int leaps of 10 minutes
      if (parseInt(value.title.split("m")[0]) % 2 !== 0) {
        return {
          ok: false,
          message: "Invalid minute value, minutes should be in leaps of 2",
        };
      }
      return {
        ok: false,
        message: "Invalid minute value",
      };
    }
  }

  return {
    ok: true,
  };
};
