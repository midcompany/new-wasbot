import React, { useState, useEffect, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field, FastField, FieldArray } from "formik";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Select,
  InputLabel,
  MenuItem,
  FormControl,
  Grid,
  Container,
} from "@material-ui/core";
import NumberFormat from "react-number-format";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import useWhatsApps from "../../hooks/useWhatsApps";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    width: "100%",
    "& > *": {
      marginRight: theme.spacing(1),
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    marginTop: theme.spacing(1),
    minWidth: 120,
    width: "100%",
  },
  maxWidth: {
    width: "100%",
  },
  divider: {
    margin: `${theme.spacing(2)}px 0`,
    borderTop: "1px solid #ccc",
    position: "relative",
    textAlign: "center",
  },
  dividerText: {
    position: "absolute",
    top: -10,
    backgroundColor: "#fff",
    padding: "0 10px",
  },
  textField: {
    marginTop: theme.spacing(1),
  },
  spacingBetweenSections: {
    marginTop: theme.spacing(3),
  },
}));

const UserModal = ({ open, onClose, userId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    email: "",
    password: "",
    profile: "user",
    allTicket: "desabled",
    whatsappId: "",
    profession: "",
    appointmentSpacing: "",
    appointmentSpacingUnit: "min",
    schedules: [
      { weekday: "Segunda-feira", weekdayEn: "monday", startTime: "", endTime: "" },
      { weekday: "Terça-feira", weekdayEn: "tuesday", startTime: "", endTime: "" },
      { weekday: "Quarta-feira", weekdayEn: "wednesday", startTime: "", endTime: "" },
      { weekday: "Quinta-feira", weekdayEn: "thursday", startTime: "", endTime: "" },
      { weekday: "Sexta-feira", weekdayEn: "friday", startTime: "", endTime: "" },
      { weekday: "Sábado", weekdayEn: "saturday", startTime: "", endTime: "" },
      { weekday: "Domingo", weekdayEn: "sunday", startTime: "", endTime: "" },
    ],
  };

  const { user: loggedInUser } = useContext(AuthContext);

  const [user, setUser] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const { loading, whatsApps } = useWhatsApps();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const { data } = await api.get(`/users/${userId}`);
        setUser((prevState) => ({
          ...prevState,
          ...data,
          schedules: data?.schedules && data?.schedules?.length > 0 ? data.schedules : prevState.schedules,
        }));
        const userQueueIds = data.queues?.map((queue) => queue.id);
        setSelectedQueueIds(userQueueIds);
      } catch (err) {
        toastError(err);
      }
    };

    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(initialState);
    setSelectedQueueIds([]);
  };

  const UserSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, i18n.t("userModal.validation.tooShort"))
      .max(50, i18n.t("userModal.validation.tooLong"))
      .required(i18n.t("userModal.validation.required")),
    password: userId
      ? Yup.string()
          .min(5, i18n.t("userModal.validation.tooShort"))
          .max(50, i18n.t("userModal.validation.tooLong"))
      : Yup.string()
          .min(5, i18n.t("userModal.validation.tooShort"))
          .max(50, i18n.t("userModal.validation.tooLong"))
          .required(i18n.t("userModal.validation.required")),
    email: Yup.string()
      .email(i18n.t("userModal.validation.invalidEmail"))
      .required(i18n.t("userModal.validation.required")),
    profile: Yup.string().required(i18n.t("userModal.validation.required")),
    allTicket: Yup.string().required(i18n.t("userModal.validation.required")),
    profession: Yup.string().when("profile", {
      is: "professional",
      then: Yup.string().required(i18n.t("userModal.validation.required")),
    }),
    appointmentSpacing: Yup.string().when("profile", {
      is: "professional",
      then: Yup.string().required(i18n.t("userModal.validation.required")),
    }),
    appointmentSpacingUnit: Yup.string().when("profile", {
      is: "professional",
      then: Yup.string().required(i18n.t("userModal.validation.required")),
    }),
    schedules: Yup.array().when("profile", {
      is: "professional",
      then: Yup.array().of(
        Yup.object().shape({
          weekday: Yup.string().required(),
          startTime: Yup.string().required(i18n.t("userModal.validation.required")),
          endTime: Yup.string().required(i18n.t("userModal.validation.required")),
        })
      ),
    }),
  });

  const handleSaveUser = async (values) => {
    const userData = {
      ...values,
      queueIds: selectedQueueIds,
    };
    try {
      if (userId) {
        await api.put(`/users/${userId}`, userData);
      } else {
        await api.post("/users", userData);
      }
      toast.success(i18n.t("userModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Formik
      initialValues={user}
      enableReinitialize={true}
      validationSchema={UserSchema}
      onSubmit={(values, actions) => {
        setTimeout(() => {
          handleSaveUser(values);
          actions.setSubmitting(false);
        }, 400);
      }}
    >
      {({ touched, errors, isSubmitting, values, setFieldValue }) => (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth={values.profile === "professional" ? "md" : "xs"}
          fullWidth
          scroll="paper"
        >
          <DialogTitle id="form-dialog-title">
            {userId
              ? `${i18n.t("userModal.title.edit")}`
              : `${i18n.t("userModal.title.add")}`}
          </DialogTitle>
          <Form>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.name")}
                    autoFocus
                    name="name"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.password")}
                    type="password"
                    name="password"
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Field
                    as={TextField}
                    label={i18n.t("userModal.form.email")}
                    name="email"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    error={touched.profile && Boolean(errors.profile)}
                  >
                    <Can
                      role={loggedInUser.profile}
                      perform="user-modal:editProfile"
                      yes={() => (
                        <>
                          <InputLabel id="profile-selection-label">
                            {i18n.t("userModal.form.profile")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t("userModal.form.profile")}
                            name="profile"
                            labelId="profile-selection-label"
                            id="profile-selection"
                            required
                            onChange={(e) => {
                              setFieldValue("profile", e.target.value);
                            }}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="professional">
                              Profissional
                            </MenuItem>
                          </Field>
                        </>
                      )}
                    />
                    {touched.profile && errors.profile && (
                      <div className="error">{errors.profile}</div>
                    )}
                  </FormControl>
                </Grid>
                {values.profile === "professional" && (
                  <>
                    <Grid item xs={12} md={6}>
                      <Field
                        as={TextField}
                        label="Profissão"
                        name="profession"
                        error={
                          touched.profession && Boolean(errors.profession)
                        }
                        helperText={touched.profession && errors.profession}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <div className={classes.multFieldLine}>
                        <Field
                          as={TextField}
                          label="Intervalo"
                          name="appointmentSpacing"
                          error={
                            touched.appointmentSpacing &&
                            Boolean(errors.appointmentSpacing)
                          }
                          helperText={
                            touched.appointmentSpacing &&
                            errors.appointmentSpacing
                          }
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          className={classes.formControl}
                          error={
                            touched.appointmentSpacingUnit &&
                            Boolean(errors.appointmentSpacingUnit)
                          }
                        >
                          <InputLabel id="spacing-unit-label">
                            Unidade
                          </InputLabel>
                          <Field
                            as={Select}
                            label="Unidade"
                            name="appointmentSpacingUnit"
                            labelId="spacing-unit-label"
                            id="spacing-unit"
                          >
                            <MenuItem value="min">Min</MenuItem>
                            <MenuItem value="hours">Horas</MenuItem>
                          </Field>
                        </FormControl>
                      </div>
                    </Grid>
                    <Grid
                      item
                      xs={12}
                      className={classes.spacingBetweenSections}
                    >
                      {/* Schedule Fields */}
                      <FieldArray
                        name="schedules"
                        render={() => (
                          <Grid container spacing={2}>
                            {values.schedules.map((item, index) => (
                              <Grid
                                container
                                item
                                spacing={1}
                                key={index}
                                alignItems="center"
                              >
                                <Grid item xs={12} md={4}>
                                  <FastField
                                    as={TextField}
                                    label="Dia da Semana"
                                    name={`schedules[${index}].weekday`}
                                    disabled
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                  />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <FastField name={`schedules[${index}].startTime`}>
                                    {({ field }) => (
                                      <NumberFormat
                                        label="Hora Inicial"
                                        {...field}
                                        variant="outlined"
                                        margin="dense"
                                        customInput={TextField}
                                        format="##:##"
                                        fullWidth
                                      />
                                    )}
                                  </FastField>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <FastField name={`schedules[${index}].endTime`}>
                                    {({ field }) => (
                                      <NumberFormat
                                        label="Hora Final"
                                        {...field}
                                        variant="outlined"
                                        margin="dense"
                                        customInput={TextField}
                                        format="##:##"
                                        fullWidth
                                      />
                                    )}
                                  </FastField>
                                </Grid>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Can
                    role={loggedInUser.profile}
                    perform="user-modal:editQueues"
                    yes={() => (
                      <QueueSelect
                        selectedQueueIds={selectedQueueIds}
                        onChange={(values) => setSelectedQueueIds(values)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Can
                    role={loggedInUser.profile}
                    perform="user-modal:editProfile"
                    yes={() =>
                      !loading && (
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          error={touched.allTicket && Boolean(errors.allTicket)}
                        >
                          <InputLabel id="allTicket-selection-label">
                            {i18n.t("userModal.form.allTicket")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t("userModal.form.allTicket")}
                            name="allTicket"
                            labelId="allTicket-selection-label"
                            id="allTicket-selection"
                            required
                          >
                            <MenuItem value="enabled">
                              {i18n.t("userModal.form.allTicketEnabled")}
                            </MenuItem>
                            <MenuItem value="desabled">
                              {i18n.t("userModal.form.allTicketDesabled")}
                            </MenuItem>
                          </Field>
                        </FormControl>
                      )
                    }
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={handleClose}
                color="secondary"
                disabled={isSubmitting}
                variant="outlined"
              >
                {i18n.t("userModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
                className={classes.btnWrapper}
              >
                {userId
                  ? `${i18n.t("userModal.buttons.okEdit")}`
                  : `${i18n.t("userModal.buttons.okAdd")}`}
                {isSubmitting && (
                  <CircularProgress
                    size={24}
                    className={classes.buttonProgress}
                  />
                )}
              </Button>
            </DialogActions>
          </Form>
        </Dialog>
      )}
    </Formik>
  );
};

export default UserModal;
