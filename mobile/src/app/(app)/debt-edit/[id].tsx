import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import type { Debt } from '../../../types';

type DebtType = 'to_receive' | 'to_pay';
type DebtStatus = 'pending' | 'received' | 'paid';

export default function EditDebtScreen() {
    const { colors } = useAppTheme();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);

    const [personName, setPersonName] = useState('');
    const [type, setType] = useState<DebtType>('to_receive');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<DebtStatus>('pending');
    const [dueDate, setDueDate] = useState<Date | null>(null);

    async function loadDebt() {
        try {
            setLoading(true);

            const response = await api.get<Debt[]>('/debts');
            const found = response.data.find((item) => item.id === Number(id));

            if (!found) {
                Alert.alert('Erro', 'Dívida não encontrada.');
                router.back();
                return;
            }

            setPersonName(found.personName);
            setType(found.type);
            setAmount(String(found.amount));
            setDescription(found.description);
            setStatus(found.status);
            setDueDate(found.dueDate ? new Date(found.dueDate) : null);
        } catch (error: any) {
            console.error(error);

            const apiMessage =
                error?.response?.data?.message ??
                'Não foi possível carregar a dívida.';

            Alert.alert('Erro', apiMessage);
            router.back();
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDebt();
    }, []);

    function handleDueDateChange(
        event: DateTimePickerEvent,
        selectedDate?: Date
    ) {
        setShowDueDatePicker(false);

        if (event.type !== 'set' || !selectedDate) {
            return;
        }

        const normalizedDate = new Date(selectedDate);
        normalizedDate.setHours(12, 0, 0, 0);

        setDueDate(normalizedDate);
    }

    async function handleSave() {
        if (!personName.trim() || !description.trim() || !amount.trim()) {
            Alert.alert(
                'Atenção',
                'Preencha nome, descrição e valor antes de salvar.'
            );
            return;
        }

        const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));

        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Atenção', 'Informe um valor válido.');
            return;
        }

        try {
            setSaving(true);

            await api.put(`/debts/${id}`, {
                personName: personName.trim(),
                type,
                amount: parsedAmount,
                description: description.trim(),
                status,
                dueDate: dueDate ? dueDate.toISOString() : null,
            });

            Alert.alert('Sucesso', 'Dívida atualizada com sucesso.', [
                {
                    text: 'OK',
                    onPress: () => router.replace('/debts'),
                },
            ]);
        } catch (error: any) {
            console.error(error);

            const apiMessage =
                error?.response?.data?.message ??
                'Não foi possível atualizar a dívida.';

            Alert.alert('Erro', apiMessage);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView
                style={[styles.centered, { backgroundColor: colors.background }]}
            >
                <ActivityIndicator size="large" />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                    Carregando dívida...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={['bottom']}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>
                    Editar dívida
                </Text>

                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Nome da pessoa
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                            color: colors.text,
                        },
                    ]}
                    placeholder="Ex.: João"
                    placeholderTextColor={colors.textMuted}
                    value={personName}
                    onChangeText={setPersonName}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        {
                            backgroundColor:
                                type === 'to_receive' ? colors.primary : colors.surfaceSecondary,
                        },
                    ]}
                    onPress={() => setType('to_receive')}
                >
                    <Text
                        style={[
                            styles.segmentButtonText,
                            { color: type === 'to_receive' ? '#FFFFFF' : colors.text },
                        ]}
                    >
                        A receber
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.segmentButton,
                        styles.segmentButtonSpacing,
                        {
                            backgroundColor:
                                type === 'to_pay' ? colors.primary : colors.surfaceSecondary,
                        },
                    ]}
                    onPress={() => setType('to_pay')}
                >
                    <Text
                        style={[
                            styles.segmentButtonText,
                            { color: type === 'to_pay' ? '#FFFFFF' : colors.text },
                        ]}
                    >
                        A pagar
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Valor</Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                            color: colors.text,
                        },
                    ]}
                    placeholder="Ex.: 80,00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Descrição
                </Text>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                            color: colors.text,
                        },
                    ]}
                    placeholder="Descrição"
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                />

                <Text style={[styles.fieldLabel, { color: colors.text }]}>Status</Text>
                {(['pending', 'received', 'paid'] as DebtStatus[]).map((item) => (
                    <TouchableOpacity
                        key={item}
                        style={[
                            styles.segmentButton,
                            {
                                backgroundColor:
                                    status === item ? colors.primary : colors.surfaceSecondary,
                            },
                        ]}
                        onPress={() => setStatus(item)}
                    >
                        <Text
                            style={[
                                styles.segmentButtonText,
                                { color: status === item ? '#FFFFFF' : colors.text },
                            ]}
                        >
                            {item === 'pending'
                                ? 'Pendente'
                                : item === 'received'
                                    ? 'Recebido'
                                    : 'Pago'}
                        </Text>
                    </TouchableOpacity>
                ))}

                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Vencimento
                </Text>
                <TouchableOpacity
                    style={[
                        styles.inputButton,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                        },
                    ]}
                    onPress={() => setShowDueDatePicker(true)}
                >
                    <Text style={{ color: colors.text }}>
                        {dueDate
                            ? dueDate.toLocaleDateString('pt-BR')
                            : 'Selecionar data (opcional)'}
                    </Text>
                </TouchableOpacity>

                {showDueDatePicker && (
                    <DateTimePicker
                        value={dueDate ?? new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDueDateChange}
                    />
                )}

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        { backgroundColor: colors.primary },
                        saving && styles.buttonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Salvando...' : 'Salvar alterações'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 12,
        fontSize: 15,
    },
    inputButton: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 12,
    },
    segmentButton: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    segmentButtonSpacing: {
        marginBottom: 12,
    },
    segmentButtonText: {
        fontWeight: '700',
    },
    saveButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});