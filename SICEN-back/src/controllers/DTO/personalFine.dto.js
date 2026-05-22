class PersonalFineDTO {
  constructor(
    fine_number,
    fine_date,
    fine_time,
    fine_article,
    fine_amount,
    fine_extra_amount,
    fine_author,
    fine_proves,
    person_ci,
    person_first_name,
    person_last_name,
    person_nationality,
    person_birth_date,
    person_sex,
    person_tel,
    person_dir,
    last_modified_by
  ) {
    this.fine_number = fine_number;
    this.fine_date = fine_date;
    this.fine_time = fine_time;
    this.fine_article = fine_article;
    this.fine_amount = fine_amount;
    this.fine_extra_amount = fine_extra_amount || 0;
    this.fine_author = fine_author;
    this.fine_proves = fine_proves;
    this.person_ci = person_ci;
    this.person_first_name = person_first_name;
    this.person_last_name = person_last_name;
    this.person_nationality = person_nationality;
    this.person_birth_date = person_birth_date;
    this.person_sex = person_sex;
    this.person_tel = person_tel || "S/D";
    this.person_dir = person_dir || "S/D";
    this.last_modified_by = last_modified_by || "S/M";
  }
}

export default PersonalFineDTO;
