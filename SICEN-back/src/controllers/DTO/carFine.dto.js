class CarFineDTO {
    constructor(fine_date,
        fine_time,
        fine_article,
        fine_amount,
        fine_extra_amount,
        fine_author,
        fine_proves,
        car_brand,
        car_model,
        car_reg_number,
        owner_ci,
        owner_name,
        owner_tel,
        owner_dir,
        last_modified_by,) {
        this.fine_date = fine_date,
        this.fine_time = fine_time,
        this.fine_article = fine_article,
        this.fine_amount = fine_amount,
        this.fine_extra_amount = fine_extra_amount || 0,
        this.fine_author = fine_author,
        this.fine_proves = fine_proves,
        this.car_brand = car_brand,
        this.car_model = car_model,
        this.car_reg_number = car_reg_number,
        this.owner_ci = owner_ci || "S/D",
        this.owner_name = owner_name || "S/D",
        this.owner_tel = owner_tel || "S/D",
        this.owner_dir = owner_dir || "S/D",
        this.last_modified_by = last_modified_by || "S/M"
    }
  }
  
  export default CarFineDTO;