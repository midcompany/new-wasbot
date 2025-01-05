import React, { useState, useEffect } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import { MenuItem, FormControl, InputLabel, Select, Grid, Tab, Box, Tabs, Checkbox, FormControlLabel } from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { InputAdornment, IconButton } from "@material-ui/core";
import QueueSelectSingle from "../../components/QueueSelectSingle";
import AssistentSelectSingle from "../AssistentSelectSingle";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import axios from "axios";
import QueueSelectPart from "../QueueSelectPart";

const useStyles = makeStyles(theme => ({
    root: {
        display: "flex",
        flexWrap: "wrap",
    },
    multFieldLine: {
        display: "flex",
        "& > *:not(:last-child)": {
            marginRight: theme.spacing(1),
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
        margin: theme.spacing(1),
        minWidth: 120,
    },
    colorAdorment: {
        width: 20,
        height: 20,
    },
}));

const PromptSchema = Yup.object().shape({
    name: Yup.string().min(5, "Muito curto!").max(100, "Muito longo!").required("Obrigatório"),
    prompt: Yup.string().min(50, "Muito curto!").required("Descreva o treinamento para Inteligência Artificial"),
    voice: Yup.string().required("Informe o modo para Voz"),
    max_tokens: Yup.number().required("Informe o número máximo de tokens"),
    temperature: Yup.number().required("Informe a temperatura"),
    apikey: Yup.string().required("Informe a API Key"),
    queueId: Yup.number().required("Informe a fila"),
    max_messages: Yup.number().required("Informe o número máximo de mensagens")
});

const PromptModal = ({ open, onClose, promptId }) => {
    const classes = useStyles();
    const [selectedVoice, setSelectedVoice] = useState("texto");
    const [assitantMode, setAssitantMode] = useState("text");
    const [showApiKey, setShowApiKey] = useState(false);
    const [delayMode, setDelayMode] = useState(false);
    const [voices, setSelectedVoices] = useState([{
        "voice_id": "texto",
        "name": "Texto"
    }]);
    const [messageTab, setMessageTab] = useState(0);

    const [token, setToken] = useState({});

    const handleToggleApiKey = () => {
        setShowApiKey(!showApiKey);
    };

    const initialState = {
        name: "",
        prompt: "",
        voice: "texto",
        voiceKey: "",
        voiceRegion: "",
        maxTokens: 100,
        temperature: 1,
        apiKey: "",
        queueId: null,
        maxMessages: 10,
        message1: '',
        message2: '',
        message3: '',
        message4: '',
        queue1Id: '',
        queue2Id: '',
        queue3Id: '',
        queue4Id: '',
    };

    const [prompt, setPrompt] = useState(initialState);
    useEffect(() => {
        const fetchPrompt = async () => {
            if (!promptId) {
                setPrompt(initialState);
                return;
            }
            try {
                const { data } = await api.get(`/prompt/${promptId}`);
                const tokenParsed = parseToken(data.prompt);
                let dataToSet = {
                    ...data, 
                    prompt: tokenParsed.assistant.trim(),
                }
                console.log(tokenParsed, data)
                if (data.voiceKey) {
                    fetchPromptVoice(data.voiceKey);
                    dataToSet['voice'] = tokenParsed?.voice
                }
                if (tokenParsed?.assistantMode) {
                    setAssitantMode(tokenParsed?.assistantMode)
                }
                if (tokenParsed?.useDelay) {
                    setDelayMode(true)
                }
                if (tokenParsed?.relations && tokenParsed?.relations.length > 0) {
                    dataToSet ={ ...dataToSet,
                        message1: tokenParsed.relations[0].key.trim() === '@!227192739191' ? '' : tokenParsed.relations[0].key.trim(),
                        message2: tokenParsed.relations[1].key.trim() === '@!227192739191' ? '' : tokenParsed.relations[1].key.trim(),
                        message3: tokenParsed.relations[2].key.trim() === '@!227192739191' ? '' : tokenParsed.relations[2].key.trim(),
                        message4: tokenParsed.relations[3].key.trim() === '@!227192739191' ? '' : tokenParsed.relations[3].key.trim(),
                        queue1Id: tokenParsed.relations[0].queue.trim() === '@!227192739191' ? '' : Number(tokenParsed.relations[0].queue.trim()),
                        queue2Id: tokenParsed.relations[1].queue.trim() === '@!227192739191' ? '' : Number(tokenParsed.relations[1].queue.trim()),
                        queue3Id: tokenParsed.relations[2].queue.trim() === '@!227192739191' ? '' : Number(tokenParsed.relations[2].queue.trim()),
                        queue4Id: tokenParsed.relations[3].queue.trim() === '@!227192739191' ? '' : Number(tokenParsed.relations[3].queue.trim()), }
                }
                setPrompt(prevState => {
                    return {
                        ...prevState,
                        ...dataToSet,
                    };
                });
                setSelectedVoice(data.voice);
                setMessageTab(0)
            } catch (err) {
                toastError(err);
            }
        };

        fetchPrompt();
    }, [promptId, open]);

    const fetchPromptVoice = async (key) => {
        try {
            const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
                headers: { 'Content-Type': 'application/json', 'xi-api-key': key }
            });
            setSelectedVoices([{
                "voice_id": "texto",
                "name": "Texto"
            }, ...response.data.voices])
        } catch (err) {
            console.log(err)
        }
    }

    const handleChangeVoiceKey = (e, setFieldValue) => {
        const { value } = e.target;
        // setPrompt((prevState) => ({ ...prevState, [name]: value }));
        setFieldValue("voiceKey", value);
        fetchPromptVoice(value)
    };
    const handleClose = () => {
        setPrompt(initialState);
        setSelectedVoice("texto");
        onClose();
    };

    const handleChangeVoice = (e) => {
        setSelectedVoice(e.target.value);
    };

    const handleSavePrompt = async values => {
        const promptData = { ...values, voice: selectedVoice };
        const relations = [
            {
                queue: values['queue1Id'] || '@!227192739191',
                key: values['message1'] || '@!227192739191',
            },
            {
                queue: values['queue2Id'] || '@!227192739191',
                key: values['message2'] || '@!227192739191',
            },
            {
                queue: values['queue3Id'] || '@!227192739191',
                key: values['message3'] || '@!227192739191',
            },
            {
                queue: values['queue4Id'] || '@!227192739191',
                key: values['message4'] || '@!227192739191',
            },
        ]
        console.log(relations)
        const dataToToken = {
            assistant: promptData.prompt,
            voice: selectedVoice,
            relations
        }
        if (assitantMode) {
            dataToToken['assistantMode'] = assitantMode
        }
        if (delayMode) {
            dataToToken['useDelay'] = 'ativo'
        }
        const newToken = createToken(dataToToken)

        promptData['prompt'] = newToken
        const resp = await api.get("/queue");

        //sk-yAoW6JLUJUt3USYep7CL61U3UIis3JtzNPaEnr8WnsT3BlbkFJU8njR3TiwgS8455SmJvQkVvdXVMBApSHhhcEMmDFMA
        try {
            if (promptId) {
                await api.put(`/prompt/${promptId}`, { ...promptData, queueId: resp.data[0].id});
            } else {
                await api.post("/prompt", { ...promptData, queueId: resp.data[0].id});
            }
            toast.success(i18n.t("promptModal.success"));
        } catch (err) {
            toastError(err);
        }
        handleClose();
    };

    function createToken(data) {
        const BLOCK_DELIMITER = '||--||';
        const TOKEN_KEYS = {
          ASSISTANT: 'assistant',
          QUEUE_KEY: 'queue-key',
          VOICE: 'voice',
          USE_DELAY: 'use-delay',
          ASSISTANT_MODE: 'assistant-mode',
        };
      
        const tokens = [];
      
        if (data.assistant) {
          tokens.push(`${TOKEN_KEYS.ASSISTANT}:${data.assistant.trim()}`);
        }
      
        if (Array.isArray(data.relations)) {
          data.relations.forEach((relation, index) => {
            tokens.push(`${TOKEN_KEYS.QUEUE_KEY}${index + 1}:${relation.queue.toString().trim()}-${relation.key.trim()}`);
          });
        }
      
        if (data.voice) {
          tokens.push(`${TOKEN_KEYS.VOICE}:${data.voice.trim()}`);
        }
      
        if (data.useDelay) {
          tokens.push(`${TOKEN_KEYS.USE_DELAY}:${data.useDelay.trim()}`);
        }
      
        if (data.assistantMode) {
          tokens.push(`${TOKEN_KEYS.ASSISTANT_MODE}:${data.assistantMode.trim()}`);
        }
      
        return tokens.join(BLOCK_DELIMITER);
      }

      function parseToken(tokenString) {
        const BLOCK_DELIMITER = '||--||';
        const TOKEN_KEYS = {
          ASSISTANT: 'assistant',
          QUEUE_KEY: 'queue-key',
          VOICE: 'voice',
          USE_DELAY: 'use-delay',
          ASSISTANT_MODE: 'assistant-mode'
        };
      
        if(!tokenString.includes(BLOCK_DELIMITER)){
          return null;
        }
      
        const tokens = tokenString.split(BLOCK_DELIMITER);
        const data = {
          assistant: null,
          relations: [],
          voice: null,
          useDelay: null,
          assistantMode: null,
        };
      
        tokens.forEach((token) => {
          const [key, value] = token.split(':');
          if (key === TOKEN_KEYS.ASSISTANT) {
            data.assistant = value?.trim();
          } else if (key.startsWith(TOKEN_KEYS.QUEUE_KEY)) {
            const [queue, key] = value.split('-');
            data.relations.push({ queue: queue?.trim(), key: key?.trim() });
          } else if (key === TOKEN_KEYS.VOICE) {
            data.voice = value?.trim();
          } else if (key === TOKEN_KEYS.USE_DELAY) {
            data.useDelay = value?.trim();
          }else if (key === TOKEN_KEYS.ASSISTANT_MODE) {
            data.assistantMode = value?.trim();
          }
        });
      
        return data;
      }

    const renderMessageField = (identifier, name_index) => {
        return (
            <Field
                as={TextField}
                id={identifier}
                name={`message${name_index}`}
                fullWidth
                rows={3}
                label={identifier}
                placeholder={identifier}
                multiline={true}
                variant="outlined"
                // helperText="Utilize variáveis como {nome}, {numero}, {email} ou defina variáveis personalziadas."
                // disabled={!campaignEditable && campaign.status !== "CANCELADA"}
            />
        );
    };
    return (
        <div className={classes.root}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                scroll="paper"
                fullWidth
            >
                <DialogTitle id="form-dialog-title">
                    {promptId
                        ? `${i18n.t("promptModal.title.edit")}`
                        : `${i18n.t("promptModal.title.add")}`}
                </DialogTitle>
                <Formik
                    initialValues={prompt}
                    enableReinitialize={true}
                    onSubmit={(values, actions) => {
                        setTimeout(() => {
                            handleSavePrompt(values);
                            actions.setSubmitting(false);
                        }, 400);
                    }}
                >
                    {({ touched, errors, isSubmitting, setFieldValue, values }) => (
                        <Form style={{ width: "100%" }}>
                            <DialogContent dividers>
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.name")}
                                    name="name"
                                    error={touched.name && Boolean(errors.name)}
                                    helperText={touched.name && errors.name}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                                <FormControl fullWidth margin="dense" variant="outlined">
                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.apikey")}
                                        name="apiKey"
                                        type={showApiKey ? 'text' : 'password'}
                                        error={touched.apiKey && Boolean(errors.apiKey)}
                                        helperText={touched.apiKey && errors.apiKey}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={handleToggleApiKey}>
                                                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </FormControl>
                                {/* <Field
                                as={TextField}
                                label={i18n.t("promptModal.form.prompt")}
                                name="prompt"
                                error={touched.prompt && Boolean(errors.prompt)}
                                helperText={touched.prompt && errors.prompt}
                                variant="outlined"
                                margin="dense"
                                fullWidth
                                rows={10}
                                multiline={true}
                            /> */}
                                {/* <QueueSelectSingle /> */}
                                {values.apiKey && <AssistentSelectSingle api_key={values.apiKey} />}

                                <Grid xs={12} item>
                                        <Tabs
                                            value={messageTab}
                                            indicatorColor="primary"
                                            textColor="primary"
                                            className={classes.tabmsg}
                                            onChange={(e, v) => setMessageTab(v)}
                                            variant="fullWidth"
                                            centered
                                            style={{
                                                borderRadius: 2,
                                            }}
                                        >
                                            <Tab label="Palavra/Frase 1" index={0} />
                                            <Tab label="Palavra/Frase 2" index={1} />
                                            <Tab label="Palavra/Frase 3" index={2} />
                                            <Tab label="Palavra/Frase 4" index={3} />
                                        </Tabs>
                                        <Box style={{ paddingTop: 20, border: "none" }}>
                                            {messageTab === 0 && 
                                                        <Grid spacing={2} container>
                                                            <Grid xs={12} md={8} item>
                                                                <>{renderMessageField("Palavra/Frase 2", '1')}</>
                                                            </Grid>
                                                            <Grid xs={12} md={4} item>
                                                            <QueueSelectPart name={'queue1Id'} />
                                                            </Grid>
                                                        </Grid>
                                                    
                                            }
                                            {messageTab === 1 && 
                                            
                                                    
                                            <Grid spacing={2} container>
                                                <Grid xs={12} md={8} item>
                                                    <>{renderMessageField("Palavra/Frase 2", "2")}</>
                                                </Grid>
                                                <Grid xs={12} md={4} item>
                                                <QueueSelectPart name={'queue2Id'} />

                                                </Grid>
                                            </Grid>
                                        
                                            }
                                            {messageTab === 2 && 
                                            
                                                    
                                            <Grid spacing={2} container>
                                                <Grid xs={12} md={8} item>
                                                    <>{renderMessageField("Palavra/Frase 3", "3")}</>
                                                </Grid>
                                                <Grid xs={12} md={4} item>
                                                <QueueSelectPart name={'queue3Id'} />

                                                </Grid>
                                            </Grid>
                                        
                                            }
                                            {messageTab === 3 && 
                                            
                                                    
                                            <Grid spacing={2} container>
                                                <Grid xs={12} md={8} item>
                                                    <>{renderMessageField("Palavra/Frase 4", "4")}</>
                                                </Grid>
                                                <Grid xs={12} md={4} item>
                                                <QueueSelectPart name={'queue4Id'} />

                                                </Grid>
                                            </Grid>
                                        
                                            }
                                            
                                        </Box>
                                    </Grid>
                                    <FormControlLabel
          								control={
            								<Checkbox
             									checked={delayMode}
             									onChange={() => setDelayMode(!delayMode)}
              									value={delayMode}
              									color="primary"
            								/>
          								}
          								label="Usar Delay"
          								labelPlacement="start"
        							/>
                                <div className={classes.multFieldLine}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>{i18n.t("promptModal.form.voice")}</InputLabel>
                                        <Select
                                            id="type-select"
                                            labelWidth={60}
                                            name="voice"
                                            value={selectedVoice}
                                            onChange={handleChangeVoice}
                                            multiple={false}
                                        >
                                            {voices.map((v) => <MenuItem key={v.voice_id} value={v.voice_id}>
                                                {v.name}
                                            </MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    

                                    <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.voiceKey")}
                                        name="voiceKey"
                                        error={touched.voiceKey && Boolean(errors.voiceKey)}
                                        helperText={touched.voiceKey && errors.voiceKey}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                        onChange={(e) => handleChangeVoiceKey(e, setFieldValue)}
                                    />
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>Modo do Assistente</InputLabel>
                                        <Select
                                            id="type-select1"
                                            labelWidth={60}
                                            value={assitantMode}
                                            onChange={(e) => setAssitantMode(e.target.value)}
                                            multiple={false}
                                        >
                                            {[{ value: 'text', name: 'Texto' }, { value: 'voice', name: 'Voz' }, { value: 'both', name: 'Ambos' }].map((v) => <MenuItem key={v.value} value={v.value}>
                                                {v.name}
                                            </MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    {/* <Field
                                        as={TextField}
                                        label={i18n.t("promptModal.form.voiceRegion")}
                                        name="voiceRegion"
                                        error={touched.voiceRegion && Boolean(errors.voiceRegion)}
                                        helperText={touched.voiceRegion && errors.voiceRegion}
                                        variant="outlined"
                                        margin="dense"
                                        fullWidth
                                    /> */}
                                </div>

                                {/* <div className={classes.multFieldLine}>
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.temperature")}
                                    name="temperature"
                                    error={touched.temperature && Boolean(errors.temperature)}
                                    helperText={touched.temperature && errors.temperature}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.max_tokens")}
                                    name="maxTokens"
                                    error={touched.maxTokens && Boolean(errors.maxTokens)}
                                    helperText={touched.maxTokens && errors.maxTokens}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                                <Field
                                    as={TextField}
                                    label={i18n.t("promptModal.form.max_messages")}
                                    name="maxMessages"
                                    error={touched.maxMessages && Boolean(errors.maxMessages)}
                                    helperText={touched.maxMessages && errors.maxMessages}
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                />
                            </div> */}
                            </DialogContent>
                            <DialogActions>
                                <Button
                                    onClick={handleClose}
                                    color="secondary"
                                    disabled={isSubmitting}
                                    variant="outlined"
                                >
                                    {i18n.t("promptModal.buttons.cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    variant="contained"
                                    className={classes.btnWrapper}
                                >
                                    {promptId
                                        ? `${i18n.t("promptModal.buttons.okEdit")}`
                                        : `${i18n.t("promptModal.buttons.okAdd")}`}
                                    {isSubmitting && (
                                        <CircularProgress
                                            size={24}
                                            className={classes.buttonProgress}
                                        />
                                    )}
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </Dialog>
        </div>
    );
};

export default PromptModal;