class UserDTO {
  constructor(avatar, first_name, last_name, rank, email, password, last_modified_by) {
    this.avatar = avatar;
    this.first_name = first_name;
    this.last_name = last_name;
    this.rank = rank
    this.email = email;
    this.password = password;
    this.last_modified_by = last_modified_by || "S/M"
  }
}

export default UserDTO;